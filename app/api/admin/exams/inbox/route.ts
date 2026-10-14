import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 20;
const CATEGORIES = {
  ELEVE: ["EXERCICE", "ANCIEN_SUJET", "EXAMEN_BLANC", "AUTRE"],
  ETUDIANT: ["EXERCICE", "CONTROLE_CONTINU", "SESSION_NORMALE", "SIMULATION_BTS_DUT"],
} as const;

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160) || "epreuve";
}

function safeFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 150) || "document.pdf";
}

export async function GET() {
  const admin = await requireAdmin("exams.read");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const [exams, levels, subjects, schools, programs] = await Promise.all([
    prisma.exam.findMany({
      where: { category: "A_CLASSER", status: "DRAFT" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, slug: true, fileUrl: true, createdAt: true },
    }),
    prisma.academicLevel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.program.findMany({ where: { kind: "FILIERE" }, orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
  ]);
  return NextResponse.json({ exams, levels, subjects, schools, programs });
}

export async function POST(request: Request) {
  const admin = await requireAdmin("exams.create");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const form = await request.formData();
  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  if (!files.length || files.length > MAX_FILES) {
    return NextResponse.json({ error: "Sélectionne entre 1 et 20 fichiers PDF." }, { status: 400 });
  }
  if (files.some((file) => !file.name.toLowerCase().endsWith(".pdf") || file.size <= 0 || file.size > MAX_SIZE || (file.type && file.type !== "application/pdf"))) {
    return NextResponse.json({ error: "Chaque fichier doit être un PDF valide de 50 Mo maximum." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    return NextResponse.json({ error: "Le stockage Supabase n'est pas configuré." }, { status: 500 });
  }

  const created: { id: string; title: string }[] = [];
  for (const file of files) {
    const title = file.name.replace(/\.pdf$/i, "").trim().slice(0, 180) || "Épreuve à classer";
    const storagePath = "exam-inbox/" + Date.now() + "-" + Math.random().toString(36).slice(2, 10) + "-" + safeFileName(file.name);
    const upload = await fetch(supabaseUrl + "/storage/v1/object/exam-files/" + storagePath.split("/").map(encodeURIComponent).join("/"), {
      method: "POST",
      headers: { Authorization: "Bearer " + secretKey, apikey: secretKey, "Content-Type": "application/pdf", "x-upsert": "false" },
      body: await file.arrayBuffer(),
      cache: "no-store",
    });
    if (!upload.ok) {
      return NextResponse.json({ error: "Le stockage a échoué sur « " + file.name + " ». " + created.length + " fichier(s) ont déjà été ajoutés." }, { status: 502 });
    }

    const fileUrl = supabaseUrl + "/storage/v1/object/public/exam-files/" + storagePath.split("/").map(encodeURIComponent).join("/");
    let slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 7);
    while (await prisma.exam.findUnique({ where: { slug }, select: { id: true } })) {
      slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 9);
    }
    const exam = await prisma.exam.create({
      data: { title, slug, fileUrl, category: "A_CLASSER", status: "DRAFT" },
      select: { id: true, title: true },
    });
    created.push(exam);
  }

  await prisma.auditLog.create({
    data: { actorId: admin.id, action: "EXAM_INBOX_UPLOADED", entity: "Exam", metadata: { count: created.length } },
  });
  return NextResponse.json({ ok: true, count: created.length, exams: created }, { status: 201 });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin("exams.update");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.ids) || !body.ids.length || body.ids.length > 100 || body.ids.some((id: unknown) => typeof id !== "string")) {
    return NextResponse.json({ error: "Sélectionne au moins un fichier à classer." }, { status: 400 });
  }

  const targetType = body.targetType;
  const category = body.category;
  const academicLevelId = body.academicLevelId;
  const programId = typeof body.programId === "string" && body.programId ? body.programId : null;
  const subjectId = typeof body.subjectId === "string" && body.subjectId ? body.subjectId : null;
  const schoolId = typeof body.schoolId === "string" && body.schoolId ? body.schoolId : null;
  const year = body.year === "" || body.year == null ? null : Number(body.year);
  const status = body.status ?? "DRAFT";

  if (targetType !== "ELEVE" && targetType !== "ETUDIANT") return NextResponse.json({ error: "Choisis le public concerné." }, { status: 400 });
  const categoriesForTarget: readonly string[] = targetType === "ELEVE" ? CATEGORIES.ELEVE : CATEGORIES.ETUDIANT;
  if (typeof category !== "string" || !categoriesForTarget.includes(category)) {
    return NextResponse.json({ error: "Choisis une catégorie valide." }, { status: 400 });
  }
  if (typeof academicLevelId !== "string" || !academicLevelId) return NextResponse.json({ error: "Choisis une classe ou un niveau." }, { status: 400 });
  if (targetType === "ETUDIANT" && !programId) return NextResponse.json({ error: "Choisis la filière des étudiants." }, { status: 400 });
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) return NextResponse.json({ error: "Année invalide." }, { status: 400 });
  if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });

  const [level, exams] = await Promise.all([
    prisma.academicLevel.findUnique({ where: { id: academicLevelId }, select: { id: true, name: true, kind: true } }),
    prisma.exam.findMany({ where: { id: { in: body.ids }, category: "A_CLASSER", status: "DRAFT" }, select: { id: true } }),
  ]);
  if (!level) return NextResponse.json({ error: "Niveau introuvable." }, { status: 400 });
  if (exams.length !== body.ids.length) return NextResponse.json({ error: "Un ou plusieurs fichiers ne sont plus dans la bibliothèque à classer. Actualise la page." }, { status: 409 });
  if (targetType === "ELEVE" && level.kind === "UNIVERSITAIRE") return NextResponse.json({ error: "Choisis un niveau scolaire pour les élèves." }, { status: 400 });
  if (targetType === "ETUDIANT" && level.kind !== "UNIVERSITAIRE") return NextResponse.json({ error: "Choisis un niveau universitaire pour les étudiants." }, { status: 400 });

  const config = await prisma.classExamConfig.findUnique({ where: { academicLevelId } });
  if (category === "EXERCICE" && config?.exercisesEnabled === false) return NextResponse.json({ error: "Les exercices sont désactivés pour ce niveau." }, { status: 400 });
  if (category === "CONTROLE_CONTINU" && config?.continuousAssessmentEnabled === false) return NextResponse.json({ error: "Le contrôle continu est désactivé." }, { status: 400 });
  if (category === "SESSION_NORMALE" && config?.normalSessionEnabled === false) return NextResponse.json({ error: "La session normale est désactivée." }, { status: 400 });
  if (category === "SIMULATION_BTS_DUT" && (!/^niv(?:eau)?\s*2$/i.test(level.name) || config?.btsDutExamEnabled !== true)) return NextResponse.json({ error: "La simulation BTS/DUT doit être activée pour le Niveau 2." }, { status: 400 });
  if (category === "ANCIEN_SUJET" && (!config?.isExamClass || config.pastExamsEnabled !== true)) return NextResponse.json({ error: "Les anciens sujets ne sont pas activés pour cette classe." }, { status: 400 });
  if (category === "EXAMEN_BLANC" && (!config?.isExamClass || config.mockExamsEnabled !== true)) return NextResponse.json({ error: "Les examens blancs ne sont pas activés pour cette classe." }, { status: 400 });

  try {
    await prisma.$transaction(body.ids.map((id: string) => prisma.exam.update({
      where: { id },
      data: {
        category,
        academicLevelId,
        subjectId,
        schoolId,
        programId: targetType === "ETUDIANT" ? programId : null,
        year,
        status,
      },
    })));
    await prisma.auditLog.create({
      data: { actorId: admin.id, action: "EXAM_INBOX_CLASSIFIED", entity: "Exam", metadata: { count: body.ids.length, category, academicLevelId, status } },
    });
    return NextResponse.json({ ok: true, count: body.ids.length });
  } catch {
    return NextResponse.json({ error: "Impossible d'enregistrer le classement des fichiers." }, { status: 500 });
  }
}

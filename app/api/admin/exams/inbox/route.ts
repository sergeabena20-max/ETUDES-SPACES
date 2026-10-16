import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { schoolSubjectNames } from "@/lib/school-subjects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 20;
const CATEGORIES = {
  ELEVE: ["EXERCICE", "SEQUENCE_1", "SEQUENCE_2", "SEQUENCE_3", "SEQUENCE_4", "SEQUENCE_5", "SEQUENCE_6", "ANCIEN_SUJET", "EXAMEN_BLANC", "AUTRE"],
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

  // Keep the school catalogue available in Supabase even if the seed command was not run.
  await Promise.all([
    ...schoolSubjectNames.map((name) => prisma.subject.upsert({ where: { name }, update: {}, create: { name } })),
    ...["6e", "5e", "4e", "3e", "2nde A", "2nde C", "2nde D", "1ère A", "1ère C", "1ère D", "Tle A", "Tle C", "Tle D"].map((name) => prisma.academicLevel.upsert({ where: { name }, update: { kind: "SCOLAIRE" }, create: { name, kind: "SCOLAIRE" } })),
    ...["Licence 1", "Licence 2", "Licence 3"].map((name) => prisma.academicLevel.upsert({ where: { name }, update: { kind: "UNIVERSITAIRE" }, create: { name, kind: "UNIVERSITAIRE" } })),
  ]);
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    return NextResponse.json({ error: "Le stockage Supabase n'est pas configuré. Vérifie NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY dans Vercel." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !["prepare", "finalize", "prepareSolution", "finalizeSolution"].includes(body.action)) {
    return NextResponse.json({ error: "Requête d'import invalide." }, { status: 400 });
  }

  const baseUrl = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl;
  const storageBase = baseUrl + "/storage/v1";

  if (body.action === "prepare" || body.action === "prepareSolution") {
    if (!Array.isArray(body.files) || body.files.length < 1 || body.files.length > MAX_FILES) {
      return NextResponse.json({ error: "Sélectionne entre 1 et 20 fichiers PDF." }, { status: 400 });
    }

    const files = body.files as { name?: unknown; size?: unknown; type?: unknown }[];
    if (files.some((file) =>
      typeof file.name !== "string" ||
      !file.name.toLowerCase().endsWith(".pdf") ||
      typeof file.size !== "number" || file.size <= 0 || file.size > MAX_SIZE ||
      (typeof file.type === "string" && file.type && file.type !== "application/pdf")
    )) {
      return NextResponse.json({ error: "Chaque fichier doit être un PDF valide de 50 Mo maximum." }, { status: 400 });
    }

    const uploads: { name: string; storagePath: string; signedUrl: string }[] = [];
    for (const file of files) {
      const name = file.name as string;
      const prefix = body.action === "prepareSolution" ? "exam-solutions/" : "exam-inbox/";
      const storagePath = prefix + Date.now() + "-" + Math.random().toString(36).slice(2, 10) + "-" + safeFileName(name);
      const signedResponse = await fetch(storageBase + "/object/upload/sign/exam-files/" + storagePath.split("/").map(encodeURIComponent).join("/"), {
        method: "POST",
        headers: { Authorization: "Bearer " + secretKey, apikey: secretKey, "Content-Type": "application/json" },
        body: JSON.stringify({}),
        cache: "no-store",
      });

      const signedData = await signedResponse.json().catch(() => null);
      if (!signedResponse.ok || typeof signedData?.url !== "string") {
        const detail = typeof signedData?.message === "string" ? signedData.message : typeof signedData?.error === "string" ? signedData.error : "Impossible de préparer l'envoi vers Supabase.";
        return NextResponse.json({ error: detail }, { status: 502 });
      }
      const signedUrl = new URL(storageBase + signedData.url, supabaseUrl).toString();
      uploads.push({ name, storagePath, signedUrl });
    }

    return NextResponse.json({ ok: true, uploads });
  }

  if (body.action === "finalizeSolution") {
    if (!Array.isArray(body.files) || body.files.length < 1 || body.files.length > MAX_FILES) {
      return NextResponse.json({ error: "Sélectionne entre 1 et 20 corrigés." }, { status: 400 });
    }
    const files = body.files as { name?: unknown; storagePath?: unknown; examId?: unknown }[];
    if (files.some((file) => typeof file.name !== "string" || typeof file.examId !== "string" || !file.examId ||
      typeof file.storagePath !== "string" || !file.storagePath.startsWith("exam-solutions/") || file.storagePath.includes(".."))) {
      return NextResponse.json({ error: "Informations de correction invalides. Associe chaque PDF à une épreuve." }, { status: 400 });
    }
    const examIds = files.map((file) => file.examId as string);
    if (new Set(examIds).size !== examIds.length) {
      return NextResponse.json({ error: "Chaque épreuve ne peut recevoir qu'un seul corrigé par import." }, { status: 400 });
    }
    const existingExams = await prisma.exam.findMany({ where: { id: { in: examIds } }, select: { id: true } });
    if (existingExams.length !== examIds.length) return NextResponse.json({ error: "Une épreuve sélectionnée est introuvable. Actualise la page." }, { status: 404 });
    for (const file of files) {
      const storagePath = file.storagePath as string;
      const objectUrl = storageBase + "/object/exam-files/" + storagePath.split("/").map(encodeURIComponent).join("/");
      const verify = await fetch(objectUrl, { method: "HEAD", headers: { Authorization: "Bearer " + secretKey, apikey: secretKey }, cache: "no-store" });
      if (!verify.ok) return NextResponse.json({ error: "Le corrigé « " + file.name + " » n'a pas été retrouvé dans Supabase. Réessaie." }, { status: 502 });
    }
    await prisma.$transaction(files.map((file) => {
      const storagePath = file.storagePath as string;
      const fileUrl = baseUrl + "/storage/v1/object/public/exam-files/" + storagePath.split("/").map(encodeURIComponent).join("/");
      return prisma.examSolution.upsert({
        where: { examId: file.examId as string },
        create: { examId: file.examId as string, fileUrl },
        update: { fileUrl, text: null },
      });
    }));
    await prisma.auditLog.create({ data: { actorId: admin.id, action: "EXAM_SOLUTIONS_UPLOADED", entity: "ExamSolution", metadata: { count: files.length, examIds } } });
    return NextResponse.json({ ok: true, count: files.length, message: files.length + " corrigé(s) associé(s) aux épreuves." }, { status: 201 });
  }

  if (!Array.isArray(body.files) || body.files.length < 1 || body.files.length > MAX_FILES) {
    return NextResponse.json({ error: "Liste de fichiers importés invalide." }, { status: 400 });
  }

  const uploadedFiles = body.files as { name?: unknown; storagePath?: unknown }[];
  if (uploadedFiles.some((file) =>
    typeof file.name !== "string" ||
    typeof file.storagePath !== "string" ||
    !file.storagePath.startsWith("exam-inbox/") ||
    file.storagePath.includes("..")
  )) {
    return NextResponse.json({ error: "Informations de fichiers invalides." }, { status: 400 });
  }

  const created: { id: string; title: string }[] = [];
  for (const file of uploadedFiles) {
    const name = file.name as string;
    const storagePath = file.storagePath as string;
    const objectUrl = storageBase + "/object/exam-files/" + storagePath.split("/").map(encodeURIComponent).join("/");
    const verify = await fetch(objectUrl, {
      method: "HEAD",
      headers: { Authorization: "Bearer " + secretKey, apikey: secretKey },
      cache: "no-store",
    });
    if (!verify.ok) {
      return NextResponse.json({ error: "Le PDF « " + name + " » n'a pas été retrouvé dans Supabase. Vérifie que l'envoi est terminé puis réessaie." }, { status: 502 });
    }

    const title = name.replace(/\.pdf$/i, "").trim().slice(0, 180) || "Épreuve à classer";
    let slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 7);
    while (await prisma.exam.findUnique({ where: { slug }, select: { id: true } })) {
      slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 9);
    }
    const fileUrl = baseUrl + "/storage/v1/object/public/exam-files/" + storagePath.split("/").map(encodeURIComponent).join("/");
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

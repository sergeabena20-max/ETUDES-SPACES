import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

const schema = z.object({
  id: z.string().uuid().optional(),
  targetType: z.enum(["ELEVE", "ETUDIANT"]),
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(3).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(2000).optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  fileUrl: z.string().trim().url().optional().nullable(),
  status: z.enum(["DRAFT","PUBLISHED","ARCHIVED"]),
  isPremium: z.boolean(),
  premiumPrice: z.coerce.number().min(0).max(100000000).optional().nullable(),
  subjectId: z.string().uuid().optional().nullable(),
  academicLevelId: z.string().uuid().optional().nullable(),
  schoolId: z.string().uuid().optional().nullable(),
  programId: z.string().uuid().optional().nullable(),
  solutionText: z.string().trim().max(20000).optional().nullable(),
  solutionFileUrl: z.string().trim().url().optional().nullable(),
});

export async function GET() {
  const admin = await requireAdmin("exams.read");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const [exams, subjects, levels, schools, programs] = await Promise.all([
    prisma.exam.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        subject: { select: { name: true } },
        academicLevel: { select: { name: true } },
        school: { select: { name: true } },
        program: { select: { name: true } },
        solution: { select: { text: true, fileUrl: true } },
      },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.academicLevel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
    prisma.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
  ]);

  const configs = await prisma.classExamConfig.findMany({
    select: {
      academicLevelId: true,
      exercisesEnabled: true,
      pastExamsEnabled: true,
      mockExamsEnabled: true,
      isExamClass: true,
      continuousAssessmentEnabled: true,
      normalSessionEnabled: true,
      btsDutExamEnabled: true,
    },
  });
  const configByLevel = new Map(configs.map((config) => [config.academicLevelId, config]));
  const examConfigs = levels.map((level) => {
    const config = configByLevel.get(level.id);
    return {
      academicLevelId: level.id,
      name: level.name,
      kind: level.kind,
      exercisesEnabled: config?.exercisesEnabled ?? true,
      pastExamsEnabled: config?.pastExamsEnabled ?? false,
      mockExamsEnabled: config?.mockExamsEnabled ?? false,
      isExamClass: config?.isExamClass ?? false,
      continuousAssessmentEnabled: config?.continuousAssessmentEnabled ?? level.kind === "UNIVERSITAIRE",
      normalSessionEnabled: config?.normalSessionEnabled ?? level.kind === "UNIVERSITAIRE",
      btsDutExamEnabled: config?.btsDutExamEnabled ?? (level.kind === "UNIVERSITAIRE" && /^niv(?:eau)?\s*2$/i.test(level.name)),
    };
  });
  return NextResponse.json({ exams, subjects, levels, schools, programs, examConfigs });
}

export async function POST(req: Request) {
  return save(req, false);
}

export async function PUT(req: Request) {
  return save(req, true);
}

async function save(req: Request, editing: boolean) {
  const admin = await requireAdmin(editing ? "exams.update" : "exams.create");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }

  const data = parsed.data;
  if (data.targetType === "ELEVE" && !data.academicLevelId) return NextResponse.json({ error: "Sélectionne la classe ou la série de cette épreuve." }, { status: 400 });
  if (data.targetType === "ETUDIANT" && !data.programId) return NextResponse.json({ error: "Sélectionne la filière de cette épreuve." }, { status: 400 });
  if (data.targetType === "ETUDIANT" && !data.academicLevelId) return NextResponse.json({ error: "Sélectionne le niveau universitaire de cette épreuve." }, { status: 400 });

  const level = data.academicLevelId
    ? await prisma.academicLevel.findUnique({ where: { id: data.academicLevelId }, select: { id: true, name: true, kind: true } })
    : null;
  if (data.academicLevelId && !level) return NextResponse.json({ error: "Niveau introuvable." }, { status: 400 });
  if (data.targetType === "ELEVE" && level?.kind === "UNIVERSITAIRE") return NextResponse.json({ error: "Choisis un niveau scolaire pour une épreuve destinée aux élèves." }, { status: 400 });
  if (data.targetType === "ETUDIANT" && level?.kind !== "UNIVERSITAIRE") return NextResponse.json({ error: "Choisis un niveau universitaire pour une épreuve destinée aux étudiants." }, { status: 400 });

  const category = data.category || "";
  const levelConfig = level ? await prisma.classExamConfig.findUnique({ where: { academicLevelId: level.id } }) : null;
  const isLevelTwo = /^niv(?:eau)?\s*2$/i.test(level?.name || "");
  if (data.targetType === "ETUDIANT") {
    const known = ["EXERCICE", "CONTROLE_CONTINU", "SESSION_NORMALE", "SIMULATION_BTS_DUT"];
    if (known.includes(category)) {
      if (category === "EXERCICE" && levelConfig?.exercisesEnabled === false) return NextResponse.json({ error: "La rubrique Exercices est désactivée pour ce niveau." }, { status: 400 });
      if (category === "CONTROLE_CONTINU" && levelConfig?.continuousAssessmentEnabled === false) return NextResponse.json({ error: "Le contrôle continu est désactivé pour ce niveau." }, { status: 400 });
      if (category === "SESSION_NORMALE" && levelConfig?.normalSessionEnabled === false) return NextResponse.json({ error: "La session normale est désactivée pour ce niveau." }, { status: 400 });
      if (category === "SIMULATION_BTS_DUT" && (!isLevelTwo || levelConfig?.btsDutExamEnabled !== true)) return NextResponse.json({ error: "La simulation BTS / DUT est disponible uniquement si elle est activée en Niveau 2." }, { status: 400 });
    } else return NextResponse.json({ error: "Sélectionne une rubrique universitaire valide." }, { status: 400 });
  } else {
    const known = ["EXERCICE", "ANCIEN_SUJET", "EXAMEN_BLANC", "Ancien sujet", "AUTRE"];
    if (!known.includes(category)) return NextResponse.json({ error: "Sélectionne une rubrique scolaire valide." }, { status: 400 });
    if (category === "EXERCICE" && levelConfig?.exercisesEnabled === false) return NextResponse.json({ error: "La rubrique Exercices est désactivée pour ce niveau." }, { status: 400 });
    if (category === "ANCIEN_SUJET" && (!levelConfig?.isExamClass || levelConfig?.pastExamsEnabled !== true)) return NextResponse.json({ error: "Les anciens sujets sont disponibles uniquement pour une classe d’examen où la rubrique est activée." }, { status: 400 });
    if (category === "EXAMEN_BLANC" && (!levelConfig?.isExamClass || levelConfig?.mockExamsEnabled !== true)) return NextResponse.json({ error: "Les examens blancs sont disponibles uniquement pour une classe d’examen où la rubrique est activée." }, { status: 400 });
  }
  if (editing && !data.id) return NextResponse.json({ error: "Épreuve introuvable." }, { status: 400 });

  try {
    const examData = {
      title: data.title,
      slug: data.slug,
      description: data.description || null,
      year: data.year ?? null,
      category: data.category || null,
      fileUrl: data.fileUrl || null,
      status: data.status,
      isPremium: data.isPremium,
      premiumPrice: data.isPremium ? (data.premiumPrice ?? null) : null,
      subjectId: data.subjectId || null,
      academicLevelId: data.academicLevelId || null,
      schoolId: data.schoolId || null,
      programId: data.targetType === "ETUDIANT" ? (data.programId || null) : null,
    };

    const exam = editing
      ? await prisma.exam.update({ where: { id: data.id! }, data: examData, select: { id: true } })
      : await prisma.exam.create({ data: examData, select: { id: true } });

    const hasSolution = Boolean(data.solutionText || data.solutionFileUrl);
    if (hasSolution) {
      await prisma.examSolution.upsert({
        where: { examId: exam.id },
        create: {
          examId: exam.id,
          text: data.solutionText || null,
          fileUrl: data.solutionFileUrl || null,
        },
        update: {
          text: data.solutionText || null,
          fileUrl: data.solutionFileUrl || null,
        },
      });
    } else if (editing) {
      await prisma.examSolution.deleteMany({ where: { examId: exam.id } });
    }

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: editing ? "EXAM_UPDATED" : "EXAM_CREATED",
        entity: "EXAM",
        entityId: exam.id,
        metadata: { title: data.title, status: data.status, year: data.year ?? null, targetType: data.targetType, academicLevelId: data.academicLevelId ?? null, programId: data.programId ?? null },
      },
    });

    return NextResponse.json({ ok: true, id: exam.id });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    if (code === "P2002") return NextResponse.json({ error: "Ce slug existe déjà." }, { status: 409 });
    if (code === "P2025") return NextResponse.json({ error: "Épreuve introuvable." }, { status: 404 });
    return NextResponse.json({ error: "Impossible d'enregistrer l'épreuve." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin("exams.delete");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string") {
    return NextResponse.json({ error: "Épreuve invalide." }, { status: 400 });
  }

  try {
    await prisma.exam.delete({ where: { id: body.id } });
    await prisma.auditLog.create({
      data: { actorId: admin.id, action: "EXAM_DELETED", entity: "EXAM", entityId: body.id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    if (code === "P2025") return NextResponse.json({ error: "Épreuve introuvable." }, { status: 404 });
    return NextResponse.json({ error: "Impossible de supprimer l'épreuve." }, { status: 500 });
  }
}

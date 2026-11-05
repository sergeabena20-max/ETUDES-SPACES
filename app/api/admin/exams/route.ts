import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { schoolSubjectNames } from "@/lib/school-subjects";

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
  academicLevelIds: z.array(z.string().uuid()).max(30).optional(),
  schoolId: z.string().uuid().optional().nullable(),
  programId: z.string().uuid().optional().nullable(),
  solutionText: z.string().trim().max(20000).optional().nullable(),
  solutionFileUrl: z.string().trim().url().optional().nullable(),
});

export async function GET() {
  const admin = await requireAdmin("exams.read");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  // Ensure the school subject catalogue and level types exist even if the seed script has not yet been run.
  await Promise.all([
    ...schoolSubjectNames.map((name) => prisma.subject.upsert({ where: { name }, update: {}, create: { name } })),
    ...["6e", "5e", "4e", "3e", "2nde A", "2nde C", "2nde D", "1ère A", "1ère C", "1ère D", "Tle A", "Tle C", "Tle D", "Tle TI"].map((name) => prisma.academicLevel.upsert({ where: { name }, update: { kind: "SCOLAIRE" }, create: { name, kind: "SCOLAIRE" } })),
    ...["Licence 1", "Licence 2", "Licence 3"].map((name) => prisma.academicLevel.upsert({ where: { name }, update: { kind: "UNIVERSITAIRE" }, create: { name, kind: "UNIVERSITAIRE" } })),
  ]);
  const terminaleTi = await prisma.academicLevel.findUnique({ where: { name: "Tle TI" }, select: { id: true } });
  if (terminaleTi) await prisma.classExamConfig.upsert({
    where: { academicLevelId: terminaleTi.id },
    update: {},
    create: { academicLevelId: terminaleTi.id, exercisesEnabled: true, isExamClass: true, pastExamsEnabled: true, mockExamsEnabled: true },
  });
  const [exams, subjects, levels, schools, programs] = await Promise.all([
    prisma.exam.findMany({
      where: { OR: [{ category: { not: "A_CLASSER" } }, { category: null }] },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        subject: { select: { name: true } },
        academicLevel: { select: { name: true } },
        academicLevels: { select: { academicLevel: { select: { id: true, name: true } } } },
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
  const selectedLevelIds = data.targetType === "ELEVE"
    ? Array.from(new Set(data.academicLevelIds?.length ? data.academicLevelIds : data.academicLevelId ? [data.academicLevelId] : []))
    : [data.academicLevelId].filter((id): id is string => Boolean(id));
  if (data.targetType === "ELEVE" && !selectedLevelIds.length) return NextResponse.json({ error: "Sélectionne au moins une classe ou série." }, { status: 400 });
  if (data.targetType === "ETUDIANT" && !data.programId) return NextResponse.json({ error: "Sélectionne la filière de cette épreuve." }, { status: 400 });
  if (data.targetType === "ETUDIANT" && !data.academicLevelId) return NextResponse.json({ error: "Sélectionne le niveau universitaire de cette épreuve." }, { status: 400 });

  const selectedLevels = selectedLevelIds.length
    ? await prisma.academicLevel.findMany({ where: { id: { in: selectedLevelIds } }, select: { id: true, name: true, kind: true } })
    : [];
  if (selectedLevels.length !== selectedLevelIds.length) return NextResponse.json({ error: "Une des classes sélectionnées est introuvable." }, { status: 400 });
  if (data.targetType === "ELEVE" && selectedLevels.some((item) => item.kind === "UNIVERSITAIRE")) return NextResponse.json({ error: "Choisis uniquement des classes scolaires pour une épreuve destinée aux élèves." }, { status: 400 });
  if (data.targetType === "ETUDIANT" && selectedLevels[0]?.kind !== "UNIVERSITAIRE") return NextResponse.json({ error: "Choisis un niveau universitaire pour cette épreuve." }, { status: 400 });

  const category = data.category || "";
  for (const level of selectedLevels) {
    const levelConfig = await prisma.classExamConfig.findUnique({ where: { academicLevelId: level.id } });
    const isLevelTwo = /^niv(?:eau)?\s*2$/i.test(level.name);
    if (data.targetType === "ETUDIANT") {
      const known = ["EXERCICE", "CONTROLE_CONTINU", "SESSION_NORMALE", "SIMULATION_BTS_DUT"];
      if (!known.includes(category)) return NextResponse.json({ error: "Sélectionne une rubrique universitaire valide." }, { status: 400 });
      if (category === "EXERCICE" && levelConfig?.exercisesEnabled === false) return NextResponse.json({ error: "La rubrique Exercices est désactivée pour " + level.name + "." }, { status: 400 });
      if (category === "CONTROLE_CONTINU" && levelConfig?.continuousAssessmentEnabled === false) return NextResponse.json({ error: "Le contrôle continu est désactivé pour " + level.name + "." }, { status: 400 });
      if (category === "SESSION_NORMALE" && levelConfig?.normalSessionEnabled === false) return NextResponse.json({ error: "La session normale est désactivée pour " + level.name + "." }, { status: 400 });
      if (category === "SIMULATION_BTS_DUT" && (!isLevelTwo || levelConfig?.btsDutExamEnabled !== true)) return NextResponse.json({ error: "La simulation BTS / DUT est disponible uniquement si elle est activée en Niveau 2." }, { status: 400 });
    } else {
      const known = ["EXERCICE", "TD", "TP", "SEQUENCE_1", "SEQUENCE_2", "SEQUENCE_3", "SEQUENCE_4", "SEQUENCE_5", "SEQUENCE_6", "ANCIEN_SUJET", "EXAMEN_BLANC", "Ancien sujet", "AUTRE"];
      if (!known.includes(category)) return NextResponse.json({ error: "Sélectionne une rubrique scolaire valide." }, { status: 400 });
      if (category === "EXERCICE" && levelConfig?.exercisesEnabled === false) return NextResponse.json({ error: "La rubrique Exercices est désactivée pour " + level.name + "." }, { status: 400 });
      if (category === "ANCIEN_SUJET" && (!levelConfig?.isExamClass || levelConfig?.pastExamsEnabled !== true)) return NextResponse.json({ error: "Les anciens sujets ne sont pas activés pour " + level.name + "." }, { status: 400 });
      if (category === "EXAMEN_BLANC" && (!levelConfig?.isExamClass || levelConfig?.mockExamsEnabled !== true)) return NextResponse.json({ error: "Les examens blancs ne sont pas activés pour " + level.name + "." }, { status: 400 });
    }
  }
  if (editing && !data.id) return NextResponse.json({ error: "Épreuve introuvable." }, { status: 400 });

  try {
    const existingExam = editing
      ? await prisma.exam.findUnique({ where: { id: data.id! }, select: { id: true, academicLevelId: true, academicLevels: { select: { academicLevelId: true } } } })
      : null;
    if (editing && !existingExam) return NextResponse.json({ error: "Épreuve introuvable." }, { status: 404 });

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
      academicLevelId: data.targetType === "ETUDIANT" ? data.academicLevelId! : selectedLevelIds[0],
      schoolId: data.schoolId || null,
      programId: data.targetType === "ETUDIANT" ? (data.programId || null) : null,
    };
    const hasSolution = Boolean(data.solutionText || data.solutionFileUrl);
    const saved = await prisma.$transaction(async (tx) => {
      const exam = editing
        ? await tx.exam.update({ where: { id: data.id! }, data: examData, select: { id: true } })
        : await tx.exam.create({ data: examData, select: { id: true } });

      if (data.targetType === "ELEVE") {
        await tx.examAcademicLevel.deleteMany({ where: { examId: exam.id } });
        await tx.examAcademicLevel.createMany({
          data: selectedLevelIds.map((academicLevelId) => ({ examId: exam.id, academicLevelId })),
          skipDuplicates: true,
        });
      } else {
        // University exams keep their existing single-level model and have no school-class links.
        await tx.examAcademicLevel.deleteMany({ where: { examId: exam.id } });
      }

      if (hasSolution) {
        await tx.examSolution.upsert({
          where: { examId: exam.id },
          create: { examId: exam.id, text: data.solutionText || null, fileUrl: data.solutionFileUrl || null },
          update: { text: data.solutionText || null, fileUrl: data.solutionFileUrl || null },
        });
      } else if (editing) {
        await tx.examSolution.deleteMany({ where: { examId: exam.id } });
      }
      return exam;
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: editing ? "EXAM_UPDATED" : "EXAM_CREATED",
        entity: "EXAM",
        entityId: saved.id,
        metadata: { title: data.title, status: data.status, year: data.year ?? null, targetType: data.targetType, academicLevelIds: selectedLevelIds, programId: data.programId ?? null },
      },
    });

    return NextResponse.json({ ok: true, id: saved.id, count: data.targetType === "ELEVE" ? selectedLevelIds.length : 1, ids: [saved.id] });
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

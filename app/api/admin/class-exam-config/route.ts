import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";
import { academicLevelLabelKey } from "@/lib/academic-level-label";

const configSchema = z.object({
  academicLevelId: z.string().uuid(),
  exercisesEnabled: z.boolean(),
  pastExamsEnabled: z.boolean(),
  mockExamsEnabled: z.boolean(),
  isExamClass: z.boolean(),
  continuousAssessmentEnabled: z.boolean(),
  normalSessionEnabled: z.boolean(),
  btsDutExamEnabled: z.boolean(),
});
const bodySchema = z.object({ configs: z.array(configSchema).max(300) });

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Administrateur." }, { status: 403 });
  const terminaleTi = await prisma.academicLevel.findUnique({ where: { name: "Tle TI" }, select: { id: true } });
  if (terminaleTi) await prisma.classExamConfig.upsert({
    where: { academicLevelId: terminaleTi.id },
    update: {},
    create: { academicLevelId: terminaleTi.id, exercisesEnabled: true, isExamClass: true, pastExamsEnabled: true, mockExamsEnabled: true },
  });
  const levels = await prisma.academicLevel.findMany({
    where: { kind: { in: ["SCOLAIRE", "UNIVERSITAIRE"] } },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, kind: true,
      examConfig: { select: { exercisesEnabled: true, pastExamsEnabled: true, mockExamsEnabled: true, isExamClass: true, continuousAssessmentEnabled: true, normalSessionEnabled: true, btsDutExamEnabled: true } },
    },
  });
  const seen = new Set<string>();
  const uniqueLevels = levels.filter((level) => { const key = academicLevelLabelKey(level.name); if (seen.has(key)) return false; seen.add(key); return true; });
  return NextResponse.json({ levels: uniqueLevels.map((level) => ({
    id: level.id, name: level.name, kind: level.kind,
    exercisesEnabled: level.examConfig?.exercisesEnabled ?? true,
    pastExamsEnabled: level.examConfig?.pastExamsEnabled ?? false,
    mockExamsEnabled: level.examConfig?.mockExamsEnabled ?? false,
    isExamClass: level.examConfig?.isExamClass ?? false,
    continuousAssessmentEnabled: level.examConfig?.continuousAssessmentEnabled ?? level.kind === "UNIVERSITAIRE",
    normalSessionEnabled: level.examConfig?.normalSessionEnabled ?? level.kind === "UNIVERSITAIRE",
    btsDutExamEnabled: level.examConfig?.btsDutExamEnabled ?? (level.kind === "UNIVERSITAIRE" && /^niv(?:eau)?\s*2$/i.test(level.name)),
  })) });
}

export async function PUT(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Administrateur." }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      const levelIds = parsed.data.configs.map((config) => config.academicLevelId);
      const levels = await tx.academicLevel.findMany({
        where: { id: { in: levelIds } },
        select: { id: true, name: true, kind: true },
      });
      const levelsById = new Map(levels.map((level) => [level.id, level]));

      for (const config of parsed.data.configs) {
        const level = levelsById.get(config.academicLevelId);
        if (!level) throw new Error("Niveau scolaire ou universitaire introuvable.");
        const isExamClass = config.isExamClass;
        const btsDutAllowed = level.kind === "UNIVERSITAIRE" && /^niv(?:eau)?\\s*2$/i.test(level.name);
        await tx.classExamConfig.upsert({
          where: { academicLevelId: config.academicLevelId },
          create: {
            academicLevelId: config.academicLevelId,
            exercisesEnabled: config.exercisesEnabled,
            isExamClass,
            pastExamsEnabled: isExamClass && config.pastExamsEnabled,
            mockExamsEnabled: isExamClass && config.mockExamsEnabled,
            continuousAssessmentEnabled: level.kind === "UNIVERSITAIRE" && config.continuousAssessmentEnabled,
            normalSessionEnabled: level.kind === "UNIVERSITAIRE" && config.normalSessionEnabled,
            btsDutExamEnabled: btsDutAllowed && config.btsDutExamEnabled,
          },
          update: {
            exercisesEnabled: config.exercisesEnabled,
            isExamClass,
            pastExamsEnabled: isExamClass && config.pastExamsEnabled,
            mockExamsEnabled: isExamClass && config.mockExamsEnabled,
            continuousAssessmentEnabled: level.kind === "UNIVERSITAIRE" && config.continuousAssessmentEnabled,
            normalSessionEnabled: level.kind === "UNIVERSITAIRE" && config.normalSessionEnabled,
            btsDutExamEnabled: btsDutAllowed && config.btsDutExamEnabled,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "CLASS_EXAM_CONFIG_UPDATED",
          entity: "ACADEMIC_LEVEL",
          metadata: { count: parsed.data.configs.length },
        },
      });
    }, { maxWait: 10000, timeout: 30000 });
    return NextResponse.json({ ok: true, count: parsed.data.configs.length });
  } catch (error) {
    console.error("class_exam_config_update_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Impossible d'enregistrer la configuration des rubriques." }, { status: 500 });
  }
}

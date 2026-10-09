import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";

const configSchema = z.object({
  academicLevelId: z.string().uuid(),
  exercisesEnabled: z.boolean(),
  pastExamsEnabled: z.boolean(),
  mockExamsEnabled: z.boolean(),
  isExamClass: z.boolean(),
});
const bodySchema = z.object({ configs: z.array(configSchema).max(300) });

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Administrateur." }, { status: 403 });
  const levels = await prisma.academicLevel.findMany({
    where: { kind: "SCOLAIRE" },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true,
      examConfig: { select: { exercisesEnabled: true, pastExamsEnabled: true, mockExamsEnabled: true, isExamClass: true } },
    },
  });
  return NextResponse.json({ levels: levels.map((level) => ({
    id: level.id, name: level.name,
    exercisesEnabled: level.examConfig?.exercisesEnabled ?? true,
    pastExamsEnabled: level.examConfig?.pastExamsEnabled ?? false,
    mockExamsEnabled: level.examConfig?.mockExamsEnabled ?? false,
    isExamClass: level.examConfig?.isExamClass ?? false,
  })) });
}

export async function PUT(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Administrateur." }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      for (const config of parsed.data.configs) {
        const isExamClass = config.isExamClass;
        await tx.classExamConfig.upsert({
          where: { academicLevelId: config.academicLevelId },
          create: {
            academicLevelId: config.academicLevelId,
            exercisesEnabled: config.exercisesEnabled,
            isExamClass,
            pastExamsEnabled: isExamClass && config.pastExamsEnabled,
            mockExamsEnabled: isExamClass && config.mockExamsEnabled,
          },
          update: {
            exercisesEnabled: config.exercisesEnabled,
            isExamClass,
            pastExamsEnabled: isExamClass && config.pastExamsEnabled,
            mockExamsEnabled: isExamClass && config.mockExamsEnabled,
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
    });
    return NextResponse.json({ ok: true, count: parsed.data.configs.length });
  } catch (error) {
    console.error("class_exam_config_update_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Impossible d'enregistrer la configuration des rubriques." }, { status: 500 });
  }
}

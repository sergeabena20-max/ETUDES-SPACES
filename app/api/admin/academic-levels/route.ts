import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";

const levelSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(100),
  kind: z.enum(["SCOLAIRE", "UNIVERSITAIRE"]),
  programIds: z.array(z.string().uuid()).default([]),
});

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });

  const [levels, programs] = await Promise.all([
    prisma.academicLevel.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, kind: true,
        programLevels: { orderBy: { order: "asc" }, select: { programId: true, order: true, program: { select: { id: true, name: true, kind: true } } } },
        _count: { select: { users: true, exams: true, courses: true, quizzes: true } },
      },
    }),
    prisma.program.findMany({
      where: { kind: "FILIERE" },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, kind: true,
        programLevels: { orderBy: { order: "asc" }, select: { academicLevelId: true, order: true, academicLevel: { select: { id: true, name: true, kind: true } } } },
        _count: { select: { users: true, exams: true, courses: true, quizzes: true } },
      },
    }),
  ]);

  return NextResponse.json({ levels, programs });
}

export async function POST(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });

  const parsed = levelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides." }, { status: 400 });

  const { name, kind, programIds } = parsed.data;
  const duplicate = await prisma.academicLevel.findUnique({ where: { name }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: "Ce niveau existe déjà." }, { status: 409 });

  if (kind === "SCOLAIRE" && programIds.length) {
    return NextResponse.json({ error: "Un niveau scolaire ne peut pas être rattaché à une filière." }, { status: 400 });
  }

  const level = await prisma.academicLevel.create({ data: { name, kind } });
  if (kind === "UNIVERSITAIRE" && programIds.length) {
    await prisma.programLevel.createMany({
      data: programIds.map((programId, index) => ({ programId, academicLevelId: level.id, order: index + 1 })),
      skipDuplicates: true,
    });
  }

  await prisma.auditLog.create({
    data: { actorId: admin.id, action: "ACADEMIC_LEVEL_CREATED", entity: "ACADEMIC_LEVEL", entityId: level.id, metadata: { name, kind, programIds } },
  });
  return NextResponse.json({ ok: true, level });
}

export async function PUT(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });

  const parsed = levelSchema.extend({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides." }, { status: 400 });

  const { id, name, kind, programIds } = parsed.data;
  const duplicate = await prisma.academicLevel.findFirst({ where: { name, NOT: { id } }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: "Ce niveau existe déjà." }, { status: 409 });
  if (kind === "SCOLAIRE" && programIds.length) return NextResponse.json({ error: "Un niveau scolaire ne peut pas être rattaché à une filière." }, { status: 400 });

  const existing = await prisma.academicLevel.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Niveau introuvable." }, { status: 404 });

  const level = await prisma.academicLevel.update({ where: { id }, data: { name, kind } });
  await prisma.programLevel.deleteMany({ where: { academicLevelId: id } });
  if (kind === "UNIVERSITAIRE" && programIds.length) {
    await prisma.programLevel.createMany({
      data: programIds.map((programId, index) => ({ programId, academicLevelId: id, order: index + 1 })),
      skipDuplicates: true,
    });
  }

  await prisma.auditLog.create({
    data: { actorId: admin.id, action: "ACADEMIC_LEVEL_UPDATED", entity: "ACADEMIC_LEVEL", entityId: id, metadata: { name, kind, programIds } },
  });
  return NextResponse.json({ ok: true, level });
}

export async function DELETE(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string") return NextResponse.json({ error: "Niveau invalide." }, { status: 400 });

  const level = await prisma.academicLevel.findUnique({
    where: { id: body.id },
    select: { id: true, name: true, _count: { select: { users: true, exams: true, courses: true, quizzes: true } } },
  });
  if (!level) return NextResponse.json({ error: "Niveau introuvable." }, { status: 404 });

  const used = level._count.users + level._count.exams + level._count.courses + level._count.quizzes;
  if (used > 0) return NextResponse.json({ error: `Impossible de supprimer « ${level.name} » : il est déjà utilisé par ${used} élément(s). Désactive-le ou déplace les contenus concernés.` }, { status: 409 });

  await prisma.academicLevel.delete({ where: { id: level.id } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "ACADEMIC_LEVEL_DELETED", entity: "ACADEMIC_LEVEL", entityId: level.id, metadata: { name: level.name } } });
  return NextResponse.json({ ok: true });
}

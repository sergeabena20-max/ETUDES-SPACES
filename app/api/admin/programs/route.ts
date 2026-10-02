import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";

const schema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(100),
  kind: z.string().trim().max(50).optional().nullable(),
});

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });
  const programs = await prisma.program.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true, _count: { select: { users: true, exams: true, courses: true, quizzes: true } } },
  });
  return NextResponse.json({ programs });
}

export async function POST(request: Request) {
  return save(request, false);
}

export async function PUT(request: Request) {
  return save(request, true);
}

async function save(request: Request, editing: boolean) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides." }, { status: 400 });

  const { id, name } = parsed.data;
  if (editing && !id) return NextResponse.json({ error: "Filière introuvable." }, { status: 400 });

  const duplicate = await prisma.program.findFirst({ where: { name, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: "Cette filière existe déjà." }, { status: 409 });

  try {
    const program = editing
      ? await prisma.program.update({ where: { id: id! }, data: { name, kind: "FILIERE" }, select: { id: true, name: true, kind: true } })
      : await prisma.program.create({ data: { name, kind: "FILIERE" }, select: { id: true, name: true, kind: true } });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: editing ? "PROGRAM_UPDATED" : "PROGRAM_CREATED",
        entity: "PROGRAM",
        entityId: program.id,
        metadata: { name: program.name },
      },
    });
    return NextResponse.json({ ok: true, program });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    if (code === "P2025") return NextResponse.json({ error: "Filière introuvable." }, { status: 404 });
    return NextResponse.json({ error: "Impossible d'enregistrer la filière." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string") return NextResponse.json({ error: "Filière invalide." }, { status: 400 });

  const program = await prisma.program.findUnique({
    where: { id: body.id },
    select: { id: true, name: true, _count: { select: { users: true, exams: true, courses: true, quizzes: true } } },
  });
  if (!program) return NextResponse.json({ error: "Filière introuvable." }, { status: 404 });

  const total = program._count.users + program._count.exams + program._count.courses + program._count.quizzes;
  if (total > 0) {
    return NextResponse.json({
      error: `Impossible de supprimer « ${program.name} » : elle est déjà utilisée par ${total} élément(s). Modifie ou déplace ces éléments avant de la supprimer.`,
    }, { status: 409 });
  }

  await prisma.program.delete({ where: { id: program.id } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "PROGRAM_DELETED", entity: "PROGRAM", entityId: program.id, metadata: { name: program.name } } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  id: z.string().uuid().optional(),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128).optional(),
  roleId: z.string().uuid().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const [admins, roles] = await Promise.all([
    prisma.user.findMany({
      where: { type: "ADMIN" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, firstName: true, lastName: true, email: true, isActive: true,
        createdAt: true, role: { select: { id: true, name: true } },
      },
    }),
    prisma.role.findMany({
      where: { name: { not: "SUPER_ADMIN" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return NextResponse.json({ admins, roles });
}

export async function POST(req: Request) {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });

  const { firstName, lastName, email, password, roleId } = parsed.data;
  if (!password) return NextResponse.json({ error: "Le mot de passe est requis pour un nouvel administrateur." }, { status: 400 });

  const [existing, role] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    roleId ? prisma.role.findUnique({ where: { id: roleId }, select: { id: true, name: true } }) : null,
  ]);
  if (existing) return NextResponse.json({ error: "Cette adresse e-mail est déjà utilisée." }, { status: 409 });
  if (roleId && (!role || role.name === "SUPER_ADMIN")) return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });

  const user = await prisma.user.create({
    data: {
      firstName, lastName, email,
      passwordHash: await hashPassword(password),
      type: "ADMIN",
      roleId: roleId ?? null,
      isActive: true,
    },
    select: { id: true, firstName: true, lastName: true, email: true, isActive: true, role: { select: { id: true, name: true } } },
  });

  await prisma.auditLog.create({
    data: { actorId: actor.id, action: "ADMIN_CREATED", entity: "User", entityId: user.id, metadata: { email: user.email, roleId: roleId ?? null } },
  });

  return NextResponse.json({ ok: true, admin: user }, { status: 201 });
}

export async function PUT(req: Request) {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success || !parsed.data.id) return NextResponse.json({ error: parsed.success ? "Administrateur introuvable." : parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });

  const { id, firstName, lastName, email, password, roleId, isActive } = parsed.data;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, type: true, email: true } });
  if (!target || target.type !== "ADMIN") return NextResponse.json({ error: "Administrateur introuvable." }, { status: 404 });
  if (id === actor.id) return NextResponse.json({ error: "Tu ne peux pas modifier ton propre compte administrateur depuis cet écran." }, { status: 400 });

  const [existing, role] = await Promise.all([
    prisma.user.findFirst({ where: { email, NOT: { id } }, select: { id: true } }),
    roleId ? prisma.role.findUnique({ where: { id: roleId }, select: { id: true, name: true } }) : null,
  ]);
  if (existing) return NextResponse.json({ error: "Cette adresse e-mail est déjà utilisée." }, { status: 409 });
  if (roleId && (!role || role.name === "SUPER_ADMIN")) return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });

  const data: Parameters<typeof prisma.user.update>[0]["data"] = {
    firstName, lastName, email, roleId: roleId ?? null,
    ...(typeof isActive === "boolean" ? { isActive } : {}),
    ...(password ? { passwordHash: await hashPassword(password) } : {}),
  };

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, firstName: true, lastName: true, email: true, isActive: true, role: { select: { id: true, name: true } } },
  });

  await prisma.auditLog.create({
    data: { actorId: actor.id, action: "ADMIN_UPDATED", entity: "User", entityId: id, metadata: { email: user.email, roleId: roleId ?? null, isActive: user.isActive, passwordChanged: Boolean(password) } },
  });

  return NextResponse.json({ ok: true, admin: user });
}

export async function DELETE(req: Request) {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json();
  if (typeof body.id !== "string") return NextResponse.json({ error: "Administrateur introuvable." }, { status: 400 });
  if (body.id === actor.id) return NextResponse.json({ error: "Tu ne peux pas désactiver ton propre compte." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: body.id }, select: { id: true, email: true, type: true, isActive: true } });
  if (!target || target.type !== "ADMIN") return NextResponse.json({ error: "Administrateur introuvable." }, { status: 404 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: { isActive: false } }),
    prisma.session.deleteMany({ where: { userId: target.id } }),
    prisma.auditLog.create({ data: { actorId: actor.id, action: "ADMIN_DEACTIVATED", entity: "User", entityId: target.id, metadata: { email: target.email } } }),
  ]);

  return NextResponse.json({ ok: true });
}

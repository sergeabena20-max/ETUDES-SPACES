import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";

export async function GET() {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const [users, roles, requests] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: {
      id: true, firstName: true, lastName: true, email: true, type: true, isActive: true, createdAt: true, studentStatus: true,
      school: { select: { name: true } }, academicLevel: { select: { name: true } }, program: { select: { name: true } }, role: { select: { id: true, name: true } },
    }}),
    prisma.role.findMany({ where: { name: { not: "SUPER_ADMIN" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.passwordResetRequest.findMany({ where: { status: "PENDING" }, orderBy: { requestedAt: "asc" }, select: { id: true, requestedAt: true, user: { select: { firstName: true, lastName: true, email: true } } }}),
  ]);
  return NextResponse.json({ users, roles, requests });
}
export async function PATCH(request: Request) {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || !["USER", "ADMIN"].includes(body.type)) return NextResponse.json({ error: "Utilisateur ou rôle invalide." }, { status: 400 });
  if (body.id === actor.id) return NextResponse.json({ error: "Tu ne peux pas modifier ton propre rôle ici." }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: body.id }, select: { id: true, type: true, email: true } });
  if (!target || target.type === "SUPER_ADMIN") return NextResponse.json({ error: "Utilisateur introuvable ou protégé." }, { status: 404 });
  let roleId: string | null = null;
  if (body.type === "ADMIN") {
    if (typeof body.roleId !== "string") return NextResponse.json({ error: "Sélectionne les permissions du rôle à attribuer." }, { status: 400 });
    const role = await prisma.role.findUnique({ where: { id: body.roleId }, select: { id: true, name: true } });
    if (!role || role.name === "SUPER_ADMIN") return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    roleId = role.id;
  }
  const updated = await prisma.user.update({ where: { id: target.id }, data: { type: body.type, roleId }, select: { id: true, type: true, email: true, role: { select: { id: true, name: true } } } });
  await prisma.auditLog.create({ data: { actorId: actor.id, action: body.type === "ADMIN" ? "USER_PROMOTED_TO_ADMIN" : "ADMIN_DEMOTED_TO_USER", entity: "User", entityId: target.id, metadata: { email: target.email, roleId } } });
  return NextResponse.json({ ok: true, user: updated });
}
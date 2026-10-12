import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    const [users, roles, requests] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true, firstName: true, lastName: true, email: true, type: true, isActive: true,
          createdAt: true, studentStatus: true,
          school: { select: { name: true } }, academicLevel: { select: { name: true } },
          program: { select: { name: true } }, role: { select: { id: true, name: true } },
          _count: { select: { payments: true } },
          payments: { orderBy: { createdAt: "desc" }, take: 3, select: {
            id: true, amount: true, currency: true, status: true, provider: true, targetType: true, createdAt: true,
          }},
        },
      }),
      prisma.role.findMany({ where: { name: { not: "SUPER_ADMIN" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.passwordResetRequest.findMany({
        where: { status: "PENDING" }, orderBy: { requestedAt: "asc" },
        select: { id: true, requestedAt: true, user: { select: { firstName: true, lastName: true, email: true } } },
      }),
    ]);
    const subscriptions = users.length ? await prisma.subscription.findMany({
      where: { userId: { in: users.map((user) => user.id) } },
      orderBy: { createdAt: "desc" }, include: { plan: { select: { name: true, code: true } } },
    }) : [];
    return NextResponse.json({
      users: users.map((user) => ({
        ...user, createdAt: user.createdAt.toISOString(),
        payments: user.payments.map((payment) => ({ ...payment, amount: payment.amount.toString(), createdAt: payment.createdAt.toISOString() })),
        subscriptions: subscriptions.filter((subscription) => subscription.userId === user.id).map((subscription) => ({
          id: subscription.id, status: subscription.status,
          startsAt: subscription.startsAt?.toISOString() ?? null, endsAt: subscription.endsAt?.toISOString() ?? null,
          createdAt: subscription.createdAt.toISOString(), plan: subscription.plan,
        })),
      })),
      roles,
      requests: requests.map((request) => ({ ...request, requestedAt: request.requestedAt.toISOString() })),
    });
  } catch (error) {
    console.error("[admin/users] Unable to load accounts", error);
    return NextResponse.json({ error: "Impossible de charger les comptes. Vérifie la connexion à la base de données et les migrations." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || !["USER", "ADMIN"].includes(body.type)) {
    return NextResponse.json({ error: "Utilisateur ou rôle invalide." }, { status: 400 });
  }
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
  const updated = await prisma.user.update({
    where: { id: target.id }, data: { type: body.type, roleId },
    select: { id: true, type: true, email: true, role: { select: { id: true, name: true } } },
  });
  await prisma.auditLog.create({
    data: { actorId: actor.id, action: body.type === "ADMIN" ? "USER_PROMOTED_TO_ADMIN" : "ADMIN_DEMOTED_TO_USER",
      entity: "User", entityId: target.id, metadata: { email: target.email, roleId } },
  });
  return NextResponse.json({ ok: true, user: updated });
}

export async function DELETE(request: Request) {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || !body.id) return NextResponse.json({ error: "Identifiant de compte invalide." }, { status: 400 });
  if (body.id === actor.id) return NextResponse.json({ error: "Tu ne peux pas supprimer ton propre compte super administrateur." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: body.id }, select: { id: true, type: true, email: true, firstName: true, lastName: true } });
  if (!target || target.type === "SUPER_ADMIN") return NextResponse.json({ error: "Compte introuvable ou protégé." }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      // Subscription.userId n'a pas de relation Prisma : supprimer explicitement ses forfaits.
      await tx.subscription.deleteMany({ where: { userId: target.id } });
      await tx.user.delete({ where: { id: target.id } });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "USER_DELETED", entity: "User", entityId: target.id,
          metadata: { email: target.email, firstName: target.firstName, lastName: target.lastName } },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/users] Unable to delete account", error);
    return NextResponse.json({ error: "La suppression a échoué. Vérifie les dépendances de ce compte et réessaie." }, { status: 500 });
  }
}

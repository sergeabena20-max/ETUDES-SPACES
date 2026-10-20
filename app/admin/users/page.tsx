import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";
import AdminUsersManager from "./all-users-manager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUsersPage() {
  const admin = await requireSuperAdmin();
  if (!admin) redirect("/dashboard");

  const [dbUsers, roles, requests, usersCount, adminsCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, firstName: true, lastName: true, email: true, type: true,
        isActive: true, createdAt: true, studentStatus: true,
        school: { select: { name: true } },
        academicLevel: { select: { name: true } },
        program: { select: { name: true } },
        role: { select: { id: true, name: true } },
        _count: { select: { payments: true } },
        payments: {
          orderBy: { createdAt: "desc" }, take: 3,
          select: { id: true, amount: true, currency: true, status: true, provider: true, targetType: true, createdAt: true },
        },
      },
    }),
    prisma.role.findMany({
      where: { name: { not: "SUPER_ADMIN" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.passwordResetRequest.findMany({
      where: { status: "PENDING" }, orderBy: { requestedAt: "asc" },
      select: { id: true, requestedAt: true, user: { select: { firstName: true, lastName: true, email: true } } },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { type: "ADMIN" } }),
  ]);

  const subscriptions = dbUsers.length ? await prisma.subscription.findMany({
    where: { userId: { in: dbUsers.map((user) => user.id) } },
    orderBy: { createdAt: "desc" },
    include: { plan: { select: { name: true, code: true } } },
  }) : [];
  const users = dbUsers.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    payments: user.payments.map((payment) => ({
      ...payment, amount: payment.amount.toString(), createdAt: payment.createdAt.toISOString(),
    })),
    subscriptions: subscriptions.filter((subscription) => subscription.userId === user.id).map((subscription) => ({
      id: subscription.id, status: subscription.status, startsAt: subscription.startsAt?.toISOString() ?? null,
      endsAt: subscription.endsAt?.toISOString() ?? null, createdAt: subscription.createdAt.toISOString(),
      plan: subscription.plan,
    })),
  }));

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl justify-between px-4 py-4">
          <Link href="/admin" className="font-black">Etudes Space 🇨🇲</Link>
          <Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Link href="/admin" className="text-sm text-sky-600">← Administration</Link>
        <h1 className="mb-2 mt-3 text-3xl font-black">Utilisateurs & administrateurs</h1>
        <p className="mb-6 text-slate-500">Tous les comptes inscrits, leurs forfaits, paiements et droits d’accès.</p>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="card p-5">Comptes inscrits<p className="text-2xl font-black">{usersCount}</p></div>
          <div className="card p-5">Administrateurs<p className="text-2xl font-black">{adminsCount}</p></div>
          <div className="card p-5">Rôles disponibles<p className="text-2xl font-black">{roles.length}</p></div>
        </div>
        <AdminUsersManager
          initialUsers={users}
          roles={roles}
          initialRequests={requests.map((request) => ({ ...request, requestedAt: request.requestedAt.toISOString() }))}
        />
      </div>
    </main>
  );
}

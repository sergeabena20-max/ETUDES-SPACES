import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";
import AdminUsersManager from "./admin-users-manager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireSuperAdmin();
  if (!admin) redirect("/dashboard");

  const [admins, roles, usersCount] = await Promise.all([
    prisma.user.findMany({
      where: { type: "ADMIN" },
      orderBy: { createdAt: "desc" },
      select: { id: true, firstName: true, lastName: true, email: true, isActive: true, createdAt: true, role: { select: { id: true, name: true } } },
    }),
    prisma.role.findMany({
      where: { name: { not: "SUPER_ADMIN" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.count(),
  ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link>
          <Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin" className="text-sm font-medium text-sky-600">← Administration</Link>
        <div className="mb-8 mt-3">
          <h1 className="text-3xl font-black text-slate-900">Utilisateurs & administrateurs</h1>
          <p className="mt-1 text-slate-500">Crée, attribue des rôles, modifie et désactive les comptes administrateurs.</p>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="card p-5"><p className="text-sm text-slate-500">Utilisateurs totaux</p><p className="mt-1 text-2xl font-black">{usersCount}</p></div>
          <div className="card p-5"><p className="text-sm text-slate-500">Administrateurs</p><p className="mt-1 text-2xl font-black">{admins.length}</p></div>
          <div className="card p-5"><p className="text-sm text-slate-500">Rôles disponibles</p><p className="mt-1 text-2xl font-black">{roles.length}</p></div>
        </div>
        <AdminUsersManager initialAdmins={admins.map(a => ({ ...a, createdAt: a.createdAt.toISOString() }))} roles={roles} />
      </div>
    </main>
  );
}

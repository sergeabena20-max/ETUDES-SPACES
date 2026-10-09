import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";
import AdminUsersManager from "./all-users-manager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireSuperAdmin();
  if (!admin) redirect("/dashboard");
  const [users, roles, requests, usersCount, adminsCount] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: {
      id: true, firstName: true, lastName: true, email: true, type: true, isActive: true, createdAt: true, studentStatus: true,
      school: { select: { name: true } }, academicLevel: { select: { name: true } }, program: { select: { name: true } },
      role: { select: { id: true, name: true } },
    }}),
    prisma.role.findMany({ where: { name: { not: "SUPER_ADMIN" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.passwordResetRequest.findMany({ where: { status: "PENDING" }, orderBy: { requestedAt: "asc" }, select: {
      id: true, requestedAt: true, user: { select: { firstName: true, lastName: true, email: true } },
    }}),
    prisma.user.count(),
    prisma.user.count({ where: { type: "ADMIN" } }),
  ]);
  return <main className="min-h-screen bg-slate-50"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl justify-between px-4 py-4"><Link href="/admin" className="font-black">Études Space 🇨🇲</Link><Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link></div></header><div className="mx-auto max-w-7xl px-4 py-8"><Link href="/admin" className="text-sm text-sky-600">← Administration</Link><h1 className="mb-2 mt-3 text-3xl font-black">Utilisateurs & administrateurs</h1><p className="mb-6 text-slate-500">Gère les comptes inscrits et les demandes de réinitialisation.</p><div className="mb-6 grid gap-4 sm:grid-cols-3"><div className="card p-5">Utilisateurs totaux <p className="text-2xl font-black">{usersCount}</p></div><div className="card p-5">Administrateurs <p className="text-2xl font-black">{adminsCount}</p></div><div className="card p-5">Rôles disponibles <p className="text-2xl font-black">{roles.length}</p></div></div><AdminUsersManager initialUsers={users.map(u=>({...u,createdAt:u.createdAt.toISOString()}))} roles={roles} initialRequests={requests.map(q=>({...q,requestedAt:q.requestedAt.toISOString()}))}/></div></main>;
}

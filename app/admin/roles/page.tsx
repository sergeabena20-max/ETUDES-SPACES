import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";
import RolesManager from "./roles-manager";

export const dynamic = "force-dynamic";

// Roles page: kept server-rendered so authorization is checked before exposing admin data.

export default async function AdminRolesPage() {
  const admin = await requireSuperAdmin();
  if (!admin) redirect("/dashboard");
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, permissions: { select: { permission: { select: { id: true, key: true, description: true } } } }, _count: { select: { users: true } } } }),
    prisma.permission.findMany({ orderBy: { key: "asc" }, select: { id: true, key: true, description: true } }),
  ]);
  const normalized = roles.map(r => ({ ...r, permissions: r.permissions.map(x => x.permission) }));
  return <main className="min-h-screen bg-slate-50">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Link href="/admin" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link><Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link></div></header>
    <div className="mx-auto max-w-7xl px-4 py-8"><Link href="/admin" className="text-sm font-medium text-sky-600">← Administration</Link><div className="mb-8 mt-3"><h1 className="text-3xl font-black text-slate-900">Rôles & permissions</h1><p className="mt-1 text-slate-500">Définis précisément ce que chaque administrateur peut gérer.</p></div><RolesManager initialRoles={normalized} permissions={permissions} /></div>
  </main>;
}
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireSuperAdmin();
  if (!admin) redirect("/dashboard");

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        type: true, studentStatus: true, isActive: true, createdAt: true,
        role: { select: { id: true, name: true } },
      },
      take: 200,
    }),
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
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
          <p className="mt-1 text-slate-500">Le Super Admin contrôle les comptes et leurs rôles.</p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Utilisateur</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Rôle</th>
                  <th className="px-5 py-4">Statut</th>
                  <th className="px-5 py-4">Compte</th>
                  <th className="px-5 py-4">Inscription</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{user.firstName} {user.lastName}</div>
                      <div className="text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        {user.type === "SUPER_ADMIN" ? "Super Admin" : user.type === "ADMIN" ? "Admin" : "Utilisateur"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{user.role?.name ?? "Aucun rôle"}</td>
                    <td className="px-5 py-4">{user.studentStatus === "ELEVE" ? "Élève" : user.studentStatus === "ETUDIANT" ? "Étudiant" : "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {user.isActive ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 card p-6">
          <h2 className="text-lg font-black">Rôles disponibles</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {roles.map((role) => (
              <span key={role.id} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{role.name}</span>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">La gestion interactive des rôles et permissions sera ajoutée dans l'étape suivante.</p>
        </div>
      </div>
    </main>
  );
}

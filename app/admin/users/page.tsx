import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdmin("users.read");
  if (!admin) redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      type: true, studentStatus: true, isActive: true, createdAt: true,
      role: { select: { name: true } },
    },
    take: 200,
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/admin" className="text-sm font-medium text-sky-600 hover:text-sky-700">← Administration</Link>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Utilisateurs</h1>
            <p className="mt-1 text-slate-500">Consultez et gérez les comptes de la plateforme.</p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
            {users.length} compte{users.length > 1 ? "s" : ""}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Utilisateur</th>
                  <th className="px-5 py-4">Type</th>
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
                      {user.role && <div className="mt-1 text-xs text-slate-400">{user.role.name}</div>}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{user.studentStatus === "ELEVE" ? "Élève" : user.studentStatus === "ETUDIANT" ? "Étudiant" : "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {user.isActive ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(user.createdAt)}</td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">Aucun utilisateur enregistré.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import { formatAcademicLevelName } from "@/lib/academic-level-label";

type Payment = {
  id: string; amount: string; currency: string; status: string;
  provider: string | null; targetType: string; createdAt: string;
};
type Subscription = {
  id: string; status: string; startsAt: string | null; endsAt: string | null;
  createdAt: string; plan: { name: string; code: string };
};
type U = {
  id: string; firstName: string; lastName: string; email: string; type: string;
  studentStatus: string | null; isActive: boolean; createdAt: string;
  school: { name: string } | null; academicLevel: { name: string } | null;
  program: { name: string } | null; role: { id: string; name: string } | null;
  _count: { payments: number }; payments: Payment[]; subscriptions: Subscription[];
};
type R = { id: string; name: string };
const roleDescriptions: Record<string, string> = {
  "Gestionnaire de contenu": "Crée et modifie les cours, les épreuves et les petits tests.",
  "Gestionnaire des épreuves": "Gère les épreuves et les petits tests, y compris leur suppression.",
  "Gestionnaire des cours": "Gère les cours et les matières.",
  "Gestionnaire des utilisateurs": "Consulte et met à jour les comptes, sans gérer les administrateurs.",
  "Gestionnaire des paiements": "Consulte et gère les paiements.",
  "Analyste": "Consulte les données et statistiques sans modifier les contenus.",
  "Administrateur polyvalent": "Accès étendu aux tâches courantes, sans les pouvoirs du super administrateur.",
};
type Q = { id: string; requestedAt: string; user: { firstName: string; lastName: string; email: string } };

function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}
function money(value: string, currency: string) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value)) + " " + currency;
}

export default function AllUsersManager({
  initialUsers, roles, initialRequests,
}: { initialUsers: U[]; roles: R[]; initialRequests: Q[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [requests, setRequests] = useState(initialRequests);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  async function setRole(id: string, type: "USER" | "ADMIN") {
    const roleId = selectedRoles[id];
    if (type === "ADMIN" && !roleId) {
      setMessage("Sélectionne d’abord le rôle et les permissions à attribuer.");
      return;
    }
    setBusyId(id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type, roleId }),
      });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || "Impossible de modifier le rôle."); return; }
      setUsers((current) => current.map((user) => user.id === id ? {
        ...user, type, role: type === "USER" ? null : (roles.find((role) => role.id === roleId) || null),
      } : user));
      setMessage(type === "ADMIN" ? "Rôle administrateur attribué." : "Droits administrateur retirés.");
    } catch {
      setMessage("Erreur réseau : le rôle n’a pas été modifié.");
    } finally { setBusyId(""); }
  }

  async function deleteUser(user: U) {
    if (!window.confirm(`Supprimer définitivement le compte de ${user.firstName} ${user.lastName} (${user.email}) ? Cette action est irréversible.`)) return;
    setBusyId(user.id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || "Impossible de supprimer ce compte."); return; }
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setMessage("Compte supprimé.");
    } catch {
      setMessage("Erreur réseau : le compte n’a pas été supprimé.");
    } finally { setBusyId(""); }
  }

  async function decide(id: string, action: "APPROVE" | "REJECT") {
    const response = await fetch("/api/admin/password-reset-requests", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Échec du traitement."); return; }
    setRequests((current) => current.filter((request) => request.id !== id));
    setMessage(data.message || "Demande traitée.");
  }

  const visible = useMemo(() => users.filter((user) => {
    const searchable = [user.firstName, user.lastName, user.email, user.school?.name, user.program?.name]
      .filter(Boolean).join(" ").toLowerCase();
    const matchesQuery = searchable.includes(query.toLowerCase());
    const matchesType = typeFilter === "ALL" || (typeFilter === "ACTIVE" ? user.isActive : typeFilter === "INACTIVE" ? !user.isActive : user.type === typeFilter);
    return matchesQuery && matchesType;
  }), [users, query, typeFilter]);

  return <div className="space-y-8">
    {message && <div role="status" className="flex items-start justify-between gap-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-950">
      <span>{message}</span><button onClick={() => setMessage("")} aria-label="Fermer le message">✕</button>
    </div>}

    <section className="card p-5">
      <h2 className="text-xl font-bold">Réinitialisation des mots de passe ({requests.length})</h2>
      {requests.length === 0 && <p className="py-4 text-sm text-slate-500">Aucune demande en attente.</p>}
      {requests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3">
        <div>{request.user.firstName} {request.user.lastName}<p className="text-sm text-slate-500">{request.user.email} · {dateLabel(request.requestedAt)}</p></div>
        <div className="flex gap-2">
          <button disabled={busyId === request.id} onClick={() => decide(request.id, "APPROVE")} className="rounded bg-violet-600 px-3 py-2 text-white disabled:opacity-50">Valider</button>
          <button disabled={busyId === request.id} onClick={() => decide(request.id, "REJECT")} className="rounded border px-3 py-2 disabled:opacity-50">Refuser</button>
        </div>
      </div>)}
    </section>

    <section className="card overflow-hidden">
      <div className="border-b p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold">Tous les comptes ({users.length})</h2><p className="mt-1 text-sm text-slate-500">{visible.length} résultat(s) affiché(s)</p></div>
          <a href="/admin/payments" className="rounded-xl border px-4 py-2 text-sm font-semibold">Voir tous les paiements →</a>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher nom, e-mail, établissement…" className="w-full rounded-xl border p-3" />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrer les comptes" className="rounded-xl border p-3">
            <option value="ALL">Tous les comptes</option><option value="USER">Utilisateurs simples</option>
            <option value="ADMIN">Administrateurs</option><option value="ACTIVE">Comptes actifs</option>
            <option value="INACTIVE">Comptes désactivés</option>
          </select>
        </div>
      </div>
      {users.length === 0 ? <div className="p-8 text-center">
        <p className="font-bold">Aucun compte reçu par la base de données.</p>
        <p className="mt-2 text-sm text-slate-500">La page ne masque pas les utilisateurs : vérifie que l’inscription et le dashboard utilisent le même projet Supabase / la même DATABASE_URL.</p>
      </div> : <div className="overflow-x-auto">
        <table className="w-full min-w-[1150px] text-left text-sm">
          <thead><tr className="bg-slate-50">
            <th className="p-3">Compte</th><th className="p-3">Inscription</th><th className="p-3">Profil scolaire</th>
            <th className="p-3">Forfait</th><th className="p-3">Paiements</th><th className="p-3">Statut / rôle</th><th className="p-3">Gérer le compte</th>
          </tr></thead>
          <tbody>{visible.map((user) => {
            const subscription = user.subscriptions[0];
            const payment = user.payments[0];
            return <tr key={user.id} className="border-t align-top">
              <td className="p-3"><p className="font-semibold">{user.firstName} {user.lastName}</p><p className="text-slate-500">{user.email}</p><p className="mt-1 text-xs text-slate-400">{user.studentStatus || "Profil non précisé"}</p></td>
              <td className="p-3 whitespace-nowrap">{dateLabel(user.createdAt)}</td>
              <td className="p-3">{user.school?.name || "Établissement non précisé"}<p className="text-slate-500">{formatAcademicLevelName(user.academicLevel?.name) || "Niveau —"}</p><p className="text-slate-500">{user.program?.name || "Filière / série —"}</p></td>
              <td className="p-3">{subscription ? <><p className="font-semibold">{subscription.plan.name}</p><p className="text-slate-500">{subscription.status}</p><p className="text-xs text-slate-400">Fin : {dateLabel(subscription.endsAt)}</p></> : <span className="text-slate-500">Aucun forfait</span>}</td>
              <td className="p-3">{user._count.payments} paiement(s){payment && <><p className="mt-1 font-semibold">{money(payment.amount, payment.currency)}</p><p className="text-slate-500">{payment.status} · {payment.targetType === "PREMIUM_PLAN" ? "Forfait" : "Épreuve"}</p><p className="text-xs text-slate-400">{dateLabel(payment.createdAt)}</p></>}</td>
              <td className="p-3"><span className={user.isActive ? "rounded-full bg-violet-50 px-2 py-1 text-violet-700" : "rounded-full bg-amber-50 px-2 py-1 text-amber-700"}>{user.isActive ? "Actif" : "Désactivé"}</span><p className="mt-2 font-semibold">{user.type === "SUPER_ADMIN" ? "Super administrateur" : user.type === "ADMIN" ? (user.role?.name || "Administrateur") : "Utilisateur"}</p></td>
              <td className="p-3">
                {user.type === "SUPER_ADMIN" ? <span className="text-xs text-slate-500">Compte protégé</span> : <div className="flex min-w-[250px] flex-col gap-2">
                  {user.type === "USER" ? <>
                    <select aria-label={`Rôle à attribuer à ${user.email}`} value={selectedRoles[user.id] || ""} onChange={(event) => setSelectedRoles((current) => ({ ...current, [user.id]: event.target.value }))} className="rounded border p-2">
                      <option value="">Choisir les permissions</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
                    {selectedRoles[user.id] && <p className="rounded-lg bg-violet-50 p-3 text-xs leading-5 text-violet-900">{roleDescriptions[roles.find((role) => role.id === selectedRoles[user.id])?.name || ""] || "Rôle personnalisé : les permissions exactes sont définies dans la gestion des rôles."}</p>}
                    <button disabled={busyId === user.id} onClick={() => setRole(user.id, "ADMIN")} className="rounded bg-violet-600 px-3 py-2 font-semibold text-white disabled:opacity-50">Nommer administrateur</button>
                  </> : <button disabled={busyId === user.id} onClick={() => setRole(user.id, "USER")} className="rounded border px-3 py-2 disabled:opacity-50">Retirer les droits admin</button>}
                  <button disabled={busyId === user.id} onClick={() => deleteUser(user)} className="rounded border border-red-200 px-3 py-2 text-red-700 disabled:opacity-50">Supprimer le compte</button>
                </div>}
              </td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </section>
  </div>;
}

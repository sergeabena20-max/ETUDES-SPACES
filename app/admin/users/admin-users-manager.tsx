"use client";

import { useState } from "react";

type Role = { id: string; name: string };
type Admin = {
  id: string; firstName: string; lastName: string; email: string;
  isActive: boolean; createdAt: string; role: Role | null;
};

export default function AdminUsersManager({ initialAdmins, roles }: { initialAdmins: Admin[]; roles: Role[] }) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setEditing(null); setFirstName(""); setLastName(""); setEmail(""); setPassword(""); setRoleId(""); setIsActive(true); setMessage("");
  }
  function edit(admin: Admin) {
    setEditing(admin); setFirstName(admin.firstName); setLastName(admin.lastName);
    setEmail(admin.email); setPassword(""); setRoleId(admin.role?.id ?? ""); setIsActive(admin.isActive); setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/admin/admins", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { id: editing.id } : {}),
          firstName, lastName, email, ...(password ? { password } : {}),
          roleId: roleId || null, ...(editing ? { isActive } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
      const fresh = await fetch("/api/admin/admins");
      const freshData = await fresh.json();
      setAdmins(freshData.admins);
      reset();
      setMessage(editing ? "Administrateur modifié avec succès." : "Administrateur créé avec succès.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally { setBusy(false); }
  }

  async function deactivate(admin: Admin) {
    if (!confirm(`Désactiver le compte de ${admin.firstName} ${admin.lastName} ?`)) return;
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: admin.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de désactiver le compte.");
      setAdmins(items => items.map(item => item.id === admin.id ? { ...item, isActive: false } : item));
      setMessage("Administrateur désactivé. Ses sessions ont été révoquées.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">{editing ? "Modifier un administrateur" : "Créer un administrateur"}</h2>
            <p className="mt-1 text-sm text-slate-500">Un administrateur reçoit uniquement les permissions de son rôle.</p>
          </div>
          {editing && <button onClick={reset} className="rounded-xl border px-4 py-2 text-sm font-semibold">Annuler</button>}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" />
          <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={editing ? "Nouveau mot de passe (optionnel)" : "Mot de passe (8 caractères minimum)"} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" />
          <select value={roleId} onChange={e => setRoleId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400">
            <option value="">Aucun rôle</option>
            {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
          {editing && (
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 accent-sky-600" />
              <span className="text-sm font-semibold">Compte actif</span>
            </label>
          )}
        </div>

        {message && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}
        <button onClick={save} disabled={busy || !firstName.trim() || !lastName.trim() || !email.trim() || (!editing && !password)} className="mt-5 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-50">
          {busy ? "Enregistrement..." : editing ? "Enregistrer les modifications" : "Créer l'administrateur"}
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b px-6 py-5">
          <h2 className="text-xl font-black">Administrateurs ({admins.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-4">Administrateur</th><th className="px-5 py-4">Rôle</th><th className="px-5 py-4">Compte</th><th className="px-5 py-4">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map(admin => (
                <tr key={admin.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4"><div className="font-semibold">{admin.firstName} {admin.lastName}</div><div className="text-slate-500">{admin.email}</div></td>
                  <td className="px-5 py-4">{admin.role?.name ?? "Aucun rôle"}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${admin.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{admin.isActive ? "Actif" : "Désactivé"}</span></td>
                  <td className="px-5 py-4"><div className="flex gap-2"><button onClick={() => edit(admin)} className="rounded-lg border px-3 py-2 text-xs font-bold">Modifier</button>{admin.isActive && <button disabled={busy} onClick={() => deactivate(admin)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600">Désactiver</button>}</div></td>
                </tr>
              ))}
              {!admins.length && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Aucun administrateur créé.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

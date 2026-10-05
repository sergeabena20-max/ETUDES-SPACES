"use client";

import Link from "next/link";
import { useState } from "react";
import AcademicCatalogManager from "./academic-catalog-manager";

type Program = {
  id: string;
  name: string;
  kind: string | null;
  _count: { users: number; exams: number; courses: number; quizzes: number };
};

export default function SettingsManager({ initialPrograms }: { initialPrograms: Program[] }) {
  const [programs, setPrograms] = useState(initialPrograms);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/programs", { cache: "no-store" });
    const data = await res.json();
    if (res.ok) setPrograms(data.programs);
  }

  async function save() {
    setMessage("");
    if (name.trim().length < 2) {
      setMessage("Le nom de la filière doit contenir au moins 2 caractères.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/programs", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name: name.trim(), kind: "FILIERE" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Enregistrement impossible.");
        return;
      }
      setName("");
      setEditingId(null);
      setMessage(editingId ? "Filière modifiée." : "Filière ajoutée.");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(program: Program) {
    if (!confirm(`Supprimer la filière « ${program.name} » ?`)) return;
    setMessage("");
    const res = await fetch("/api/admin/programs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: program.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Suppression impossible.");
      return;
    }
    setMessage("Filière supprimée.");
    await refresh();
  }

  function edit(program: Program) {
    setEditingId(program.id);
    setName(program.name);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mt-8 space-y-6">
      <AcademicCatalogManager />
      <section className="card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-sky-600">Catalogue académique</p>
            <h2 className="mt-1 text-2xl font-black">Filières étudiants</h2>
            <p className="mt-1 text-sm text-slate-500">Ajoute, renomme ou supprime les filières disponibles sur la plateforme.</p>
          </div>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">{programs.length} filière(s)</span>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void save(); }}
            placeholder="Ex. Génie Civil"
            className="flex-1 rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200"
          />
          <button onClick={() => void save()} disabled={saving} className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-50">
            {saving ? "Enregistrement..." : editingId ? "Enregistrer la modification" : "+ Ajouter la filière"}
          </button>
          {editingId && <button onClick={() => { setEditingId(null); setName(""); }} className="rounded-xl border px-5 py-3 font-bold">Annuler</button>}
        </div>

        {message && <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">{message}</p>}

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {programs.map((program) => {
            const used = program._count.users + program._count.exams + program._count.courses + program._count.quizzes;
            return (
              <div key={program.id} className="rounded-2xl border bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black">{program.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {program._count.users} utilisateur(s) · {program._count.exams} épreuve(s) · {program._count.courses} cours · {program._count.quizzes} test(s)
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">FILIÈRE</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => edit(program)} className="rounded-lg border px-3 py-2 text-sm font-bold">Modifier</button>
                  <button onClick={() => void remove(program)} disabled={used > 0} title={used > 0 ? "Cette filière est encore utilisée." : "Supprimer"} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-40">Supprimer</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/premium" className="card p-5 transition hover:-translate-y-1"><span className="text-2xl">💳</span><h3 className="mt-3 font-black">Premium & paiements</h3><p className="mt-1 text-sm text-slate-500">Prix, durée, Mobile Money, instructions.</p></Link>
        <Link href="/admin/notice" className="card p-5 transition hover:-translate-y-1"><span className="text-2xl">📢</span><h3 className="mt-3 font-black">Messages du site</h3><p className="mt-1 text-sm text-slate-500">Maintenance, information et audience.</p></Link>
        <Link href="/admin/roles" className="card p-5 transition hover:-translate-y-1"><span className="text-2xl">🔐</span><h3 className="mt-3 font-black">Rôles & permissions</h3><p className="mt-1 text-sm text-slate-500">Définir les droits des administrateurs.</p></Link>
        <Link href="/admin/users" className="card p-5 transition hover:-translate-y-1"><span className="text-2xl">👥</span><h3 className="mt-3 font-black">Utilisateurs</h3><p className="mt-1 text-sm text-slate-500">Gérer les comptes et accès.</p></Link>
      </section>
    </div>
  );
}

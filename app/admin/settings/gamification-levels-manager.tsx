"use client";

import { useState } from "react";

type Level = { id: string; name: string; minPoints: number; icon: string; description: string | null; active: boolean; order: number };

export default function GamificationLevelsManager({ initialLevels }: { initialLevels: Level[] }) {
  const [levels, setLevels] = useState(initialLevels);
  const [editing, setEditing] = useState<Level | null>(null);
  const [form, setForm] = useState({ name: "", minPoints: 0, icon: "⭐", description: "", active: true, order: 1 });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function edit(level: Level) {
    setEditing(level);
    setForm({ name: level.name, minPoints: level.minPoints, icon: level.icon, description: level.description || "", active: level.active, order: level.order });
    setMessage("");
  }
  function reset() {
    setEditing(null);
    setForm({ name: "", minPoints: 0, icon: "⭐", description: "", active: true, order: levels.length + 1 });
  }
  async function save() {
    setSaving(true); setMessage("");
    try {
      const res = await fetch("/api/admin/gamification-levels", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { ...form, id: editing.id } : form) });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Enregistrement impossible."); return; }
      setLevels((items) => (editing ? items.map((x) => x.id === data.level.id ? data.level : x) : [...items, data.level]).sort((a,b) => a.order-b.order || a.minPoints-b.minPoints));
      setMessage(editing ? "Niveau modifié." : "Niveau ajouté.");
      reset();
    } finally { setSaving(false); }
  }
  async function remove(level: Level) {
    if (!confirm("Supprimer le niveau « " + level.name + " » ?")) return;
    const res = await fetch("/api/admin/gamification-levels", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: level.id }) });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || "Suppression impossible."); return; }
    setLevels((items) => items.filter((x) => x.id !== level.id));
    setMessage("Niveau supprimé.");
  }

  return <section className="card mt-8 p-6">
    <p className="text-sm font-bold text-sky-600">Gamification</p>
    <h2 className="mt-1 text-2xl font-black">Niveaux de progression</h2>
    <p className="mt-1 text-sm text-slate-500">Le Super Admin définit les seuils de points. Aucun changement de code n'est nécessaire.</p>
    <div className="mt-5 grid gap-3 rounded-2xl border bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-3">
      <input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="Nom du niveau" className="rounded-xl border bg-white px-3 py-2" />
      <input type="number" min="0" value={form.minPoints} onChange={(e)=>setForm({...form,minPoints:Number(e.target.value)})} placeholder="Points minimum" className="rounded-xl border bg-white px-3 py-2" />
      <input value={form.icon} onChange={(e)=>setForm({...form,icon:e.target.value})} placeholder="Icône" className="rounded-xl border bg-white px-3 py-2" />
      <input value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} placeholder="Description" className="rounded-xl border bg-white px-3 py-2 md:col-span-2" />
      <input type="number" min="0" value={form.order} onChange={(e)=>setForm({...form,order:Number(e.target.value)})} placeholder="Ordre" className="rounded-xl border bg-white px-3 py-2" />
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.active} onChange={(e)=>setForm({...form,active:e.target.checked})} /> Niveau actif</label>
      <div className="flex gap-2"><button onClick={()=>void save()} disabled={saving} className="rounded-xl bg-sky-600 px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? "Enregistrement..." : editing ? "Modifier" : "Ajouter"}</button>{editing && <button onClick={reset} className="rounded-xl border px-4 py-2 font-bold">Annuler</button>}</div>
    </div>
    {message && <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold">{message}</p>}
    <div className="mt-5 space-y-2">
      {levels.map((level)=><div key={level.id} className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><span className="font-black">{level.icon} {level.name}</span><span className="ml-2 rounded-full bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700">{level.minPoints} points</span><p className="mt-1 text-xs text-slate-500">{level.description || "Sans description"} · {level.active ? "ACTIF" : "DÉSACTIVÉ"}</p></div>
        <div className="flex gap-2"><button onClick={()=>edit(level)} className="rounded-lg border px-3 py-2 text-sm font-bold">Modifier</button><button onClick={()=>void remove(level)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600">Supprimer</button></div>
      </div>)}
    </div>
  </section>;
}

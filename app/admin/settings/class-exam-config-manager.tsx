"use client";

import { useEffect, useState } from "react";

type ClassConfig = {
  id: string;
  name: string;
  exercisesEnabled: boolean;
  pastExamsEnabled: boolean;
  mockExamsEnabled: boolean;
  isExamClass: boolean;
};

export default function ClassExamConfigManager() {
  const [classes, setClasses] = useState<ClassConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/class-exam-config", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Chargement impossible.");
        setClasses(data.levels);
      })
      .catch((error) => setMessage(error.message || "Chargement impossible."))
      .finally(() => setLoading(false));
  }, []);

  function update(id: string, patch: Partial<ClassConfig>) {
    setClasses((items) => items.map((item) => {
      if (item.id !== id) return item;
      const next = { ...item, ...patch };
      if (!next.isExamClass) {
        next.pastExamsEnabled = false;
        next.mockExamsEnabled = false;
      }
      return next;
    }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/class-exam-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: classes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Enregistrement impossible.");
      setMessage("Configuration enregistrée pour " + data.count + " classes.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="card mt-8 p-5 sm:p-6">
    <div>
      <p className="text-sm font-bold text-sky-600">CATALOGUE DES ÉPREUVES</p>
      <h2 className="mt-1 text-xl font-black">Rubriques disponibles par classe</h2>
      <p className="mt-2 text-sm text-slate-500">Les anciens sujets et examens blancs ne peuvent être activés que pour les classes marquées comme classes d'examen.</p>
    </div>
    {loading ? <p className="mt-5 text-sm text-slate-500">Chargement des classes…</p> : <div className="mt-5 space-y-3">
      {classes.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold">{item.name}</h3>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={item.isExamClass} onChange={(event) => update(item.id, { isExamClass: event.target.checked })} /> Classe d'examen</label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm"><input type="checkbox" checked={item.exercisesEnabled} onChange={(event) => update(item.id, { exercisesEnabled: event.target.checked })} /> Exercices</label>
          <label className={"flex items-center gap-2 rounded-xl p-3 text-sm " + (item.isExamClass ? "bg-slate-50" : "bg-slate-100 text-slate-400")}><input type="checkbox" disabled={!item.isExamClass} checked={item.pastExamsEnabled} onChange={(event) => update(item.id, { pastExamsEnabled: event.target.checked })} /> Anciens sujets d'examen</label>
          <label className={"flex items-center gap-2 rounded-xl p-3 text-sm " + (item.isExamClass ? "bg-slate-50" : "bg-slate-100 text-slate-400")}><input type="checkbox" disabled={!item.isExamClass} checked={item.mockExamsEnabled} onChange={(event) => update(item.id, { mockExamsEnabled: event.target.checked })} /> Examens blancs</label>
        </div>
      </div>)}
      {!classes.length && <p className="text-sm text-amber-700">Aucune classe scolaire n'est configurée dans le catalogue.</p>}
    </div>}
    {message && <p className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}
    <button onClick={save} disabled={loading || saving || !classes.length} className="mt-5 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer les rubriques"}</button>
  </section>;
}

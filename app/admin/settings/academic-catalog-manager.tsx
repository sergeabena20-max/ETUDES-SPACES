"use client";

import { useEffect, useMemo, useState } from "react";

type Program = {
  id: string;
  name: string;
  kind: string | null;
  programLevels: { academicLevelId: string; order: number; academicLevel: { id: string; name: string; kind: string | null } }[];
  _count: { users: number; exams: number; courses: number; quizzes: number };
};

type Level = {
  id: string;
  name: string;
  kind: string | null;
  programLevels: { programId: string; order: number; program: { id: string; name: string; kind: string | null } }[];
  _count: { users: number; exams: number; courses: number; quizzes: number };
};

export default function AcademicCatalogManager() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"SCOLAIRE" | "UNIVERSITAIRE">("SCOLAIRE");
  const [programIds, setProgramIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/academic-levels", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de charger le catalogue.");
      setLevels(data.levels || []);
      setPrograms(data.programs || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de charger le catalogue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const schoolLevels = useMemo(() => levels.filter((level) => level.kind === "SCOLAIRE"), [levels]);
  const universityLevels = useMemo(() => levels.filter((level) => level.kind === "UNIVERSITAIRE"), [levels]);

  function reset() {
    setEditingId(null);
    setName("");
    setKind("SCOLAIRE");
    setProgramIds([]);
  }

  function edit(level: Level) {
    setEditingId(level.id);
    setName(level.name);
    setKind(level.kind === "UNIVERSITAIRE" ? "UNIVERSITAIRE" : "SCOLAIRE");
    setProgramIds(level.programLevels.map((item) => item.programId));
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleProgram(id: string) {
    setProgramIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function save() {
    setMessage("");
    if (name.trim().length < 2) {
      setMessage("Le nom du niveau doit contenir au moins 2 caractères.");
      return;
    }
    if (kind === "UNIVERSITAIRE" && !programIds.length) {
      setMessage("Sélectionne au moins une filière pour un niveau universitaire.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/academic-levels", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name: name.trim(), kind, programIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Enregistrement impossible.");
        return;
      }
      setMessage(editingId ? "Niveau modifié." : "Niveau créé.");
      reset();
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(level: Level) {
    if (!confirm(`Supprimer « ${level.name} » ?`)) return;
    const res = await fetch("/api/admin/academic-levels", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: level.id }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Niveau supprimé." : data.error || "Suppression impossible.");
    if (res.ok) await refresh();
  }

  return (
    <section className="card mt-6 p-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-sky-600">Catalogue académique</p>
          <h2 className="mt-1 text-2xl font-black">📁 Classes, niveaux et filières</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">Le Super Admin organise les niveaux sans modifier le code. Un niveau universitaire peut être rattaché à plusieurs filières.</p>
        </div>
        <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">{levels.length} niveau(x) · {programs.length} filière(s)</div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <label className="text-sm font-bold">Nom du niveau<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Master 1" className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-sky-200" /></label>
          <label className="text-sm font-bold">Catégorie<select value={kind} onChange={(e) => { const next = e.target.value as "SCOLAIRE" | "UNIVERSITAIRE"; setKind(next); if (next === "SCOLAIRE") setProgramIds([]); }} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal"><option value="SCOLAIRE">Élève / scolaire</option><option value="UNIVERSITAIRE">Étudiant / universitaire</option></select></label>
        </div>

        {kind === "UNIVERSITAIRE" && (
          <div className="mt-4">
            <p className="text-sm font-bold">Filières concernées</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {programs.map((program) => <button type="button" key={program.id} onClick={() => toggleProgram(program.id)} className={`rounded-xl border px-3 py-2 text-sm font-bold ${programIds.includes(program.id) ? "border-sky-500 bg-sky-50 text-sky-700" : "bg-white text-slate-600"}`}>{program.name}</button>)}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => void save()} disabled={saving} className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Enregistrement..." : editingId ? "Enregistrer la modification" : "+ Ajouter le niveau"}</button>
          {editingId && <button onClick={reset} className="rounded-xl border px-5 py-3 text-sm font-bold">Annuler</button>}
        </div>
        {message && <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">{message}</p>}
      </div>

      {loading ? <div className="mt-6 rounded-2xl border p-6 text-sm text-slate-500">Chargement du catalogue...</div> : (
        <div className="mt-6 space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-xl font-black">👨🏾‍🎓 Élèves</h3><span className="text-xs font-bold text-slate-500">{schoolLevels.length} niveau(x)</span></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {schoolLevels.map((level) => <LevelCard key={level.id} level={level} onEdit={edit} onRemove={remove} />)}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-xl font-black">🎓 Étudiants</h3><span className="text-xs font-bold text-slate-500">{programs.length} filière(s)</span></div>
            <div className="space-y-4">
              {programs.map((program) => (
                <div key={program.id} className="rounded-2xl border bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><h4 className="text-lg font-black">{program.name}</h4><p className="text-xs text-slate-500">{program._count.users} utilisateur(s) · {program._count.exams} épreuve(s) · {program._count.courses} cours · {program._count.quizzes} test(s)</p></div>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{program.programLevels.length} niveau(x)</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {program.programLevels.map((item) => <div key={item.academicLevelId} className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm font-bold"><span>{item.academicLevel.name}</span><button type="button" onClick={() => edit(levels.find((level) => level.id === item.academicLevelId)!)} className="text-sky-600">Modifier</button></div>)}
                    {!program.programLevels.length && <p className="text-sm text-slate-500">Aucun niveau rattaché.</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function LevelCard({ level, onEdit, onRemove }: { level: Level; onEdit: (level: Level) => void; onRemove: (level: Level) => void }) {
  const used = level._count.users + level._count.exams + level._count.courses + level._count.quizzes;
  return <div className="rounded-2xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-black">{level.name}</h4><p className="mt-1 text-xs text-slate-500">{level._count.users} utilisateur(s) · {level._count.exams} épreuve(s)</p></div><span className="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700">{level.kind === "UNIVERSITAIRE" ? "UNIVERSITAIRE" : "SCOLAIRE"}</span></div><div className="mt-3 flex gap-2"><button onClick={() => onEdit(level)} className="rounded-lg border px-3 py-2 text-xs font-bold">Modifier</button><button onClick={() => void onRemove(level)} disabled={used > 0} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-40">Supprimer</button></div></div>;
}

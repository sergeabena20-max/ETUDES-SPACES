"use client";

import { useEffect, useState } from "react";

type ClassConfig = {
  id: string;
  name: string;
  kind: string | null;
  exercisesEnabled: boolean;
  pastExamsEnabled: boolean;
  mockExamsEnabled: boolean;
  isExamClass: boolean;
  continuousAssessmentEnabled: boolean;
  normalSessionEnabled: boolean;
  btsDutExamEnabled: boolean;
};

function isLevelTwo(name: string) {
  return /\bniv(?:eau)?\s*2\b/i.test(name);
}

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
    setClasses((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/class-exam-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configs: classes.map((item) => ({
            academicLevelId: item.id,
            exercisesEnabled: item.exercisesEnabled,
            pastExamsEnabled: item.pastExamsEnabled,
            mockExamsEnabled: item.mockExamsEnabled,
            isExamClass: item.isExamClass,
            continuousAssessmentEnabled: item.continuousAssessmentEnabled,
            normalSessionEnabled: item.normalSessionEnabled,
            btsDutExamEnabled: item.btsDutExamEnabled,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Enregistrement impossible.");
      setMessage("Configuration enregistrée pour " + data.count + " niveaux.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  function toggle(item: ClassConfig, key: keyof ClassConfig, label: string, disabled = false) {
    return (
      <label key={key} className={"flex items-center gap-2 rounded-xl p-3 text-sm " + (disabled ? "bg-slate-100 text-slate-400" : "bg-slate-50")}>
        <input type="checkbox" disabled={disabled} checked={Boolean(item[key])} onChange={(event) => update(item.id, { [key]: event.target.checked } as Partial<ClassConfig>)} />
        {label}
      </label>
    );
  }

  return <section className="card mt-8 p-5 sm:p-6">
    <div>
      <p className="text-sm font-bold text-sky-600">CATALOGUE DES ÉPREUVES</p>
      <h2 className="mt-1 text-xl font-black">Rubriques disponibles par niveau</h2>
      <p className="mt-2 text-sm text-slate-500">Les élèves gardent les anciens sujets et examens blancs. Pour les étudiants, on configure les CC, la session normale et, uniquement en Niveau 2, la simulation BTS / DUT.</p>
    </div>
    {loading ? <p className="mt-5 text-sm text-slate-500">Chargement des niveaux…</p> : <div className="mt-5 space-y-3">
      {classes.map((item) => {
        const isUniversity = item.kind === "UNIVERSITAIRE";
        const levelTwo = isUniversity && isLevelTwo(item.name);
        return <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">{item.name}</h3>
              <p className="mt-1 text-xs text-slate-500">{isUniversity ? "Étudiants · filière universitaire" : "Élèves · enseignement scolaire"}</p>
            </div>
            {!isUniversity && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={item.isExamClass} onChange={(event) => update(item.id, { isExamClass: event.target.checked })} /> Classe d'examen</label>}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {toggle(item, "exercisesEnabled", "Exercices")}
            {isUniversity ? <>
              {toggle(item, "continuousAssessmentEnabled", "Contrôle continu (CC)")}
              {toggle(item, "normalSessionEnabled", "Session normale")}
              {levelTwo && toggle(item, "btsDutExamEnabled", "Simulation d’examen BTS / DUT")}
            </> : <>
              {toggle(item, "pastExamsEnabled", "Anciens sujets d'examen", !item.isExamClass)}
              {toggle(item, "mockExamsEnabled", "Examens blancs", !item.isExamClass)}
            </>}
          </div>
        </div>;
      })}
      {!classes.length && <p className="text-sm text-amber-700">Aucun niveau scolaire ou universitaire n'est configuré dans le catalogue.</p>}
    </div>}
    {message && <p role="status" className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}
    <button onClick={save} disabled={loading || saving || !classes.length} className="mt-5 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer les rubriques"}</button>
  </section>;
}

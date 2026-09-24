"use client";

import { useEffect, useMemo, useState } from "react";

type Option = { id: string; name: string };
type Exam = {
  id: string; title: string; slug: string; description: string | null; year: number | null;
  category: string | null; fileUrl: string | null; status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isPremium: boolean; subjectId: string | null; academicLevelId: string | null;
  schoolId: string | null; programId: string | null;
  subject?: { name: string } | null; academicLevel?: { name: string } | null;
  school?: { name: string } | null; program?: { name: string } | null;
  solution?: { text: string | null; fileUrl: string | null } | null;
};

type Form = {
  id?: string; title: string; slug: string; description: string; year: string; category: string;
  fileUrl: string; status: Exam["status"]; isPremium: boolean; subjectId: string; academicLevelId: string;
  schoolId: string; programId: string; solutionText: string; solutionFileUrl: string;
};

const empty: Form = {
  title: "", slug: "", description: "", year: "", category: "Ancien sujet", fileUrl: "",
  status: "DRAFT", isPremium: false, subjectId: "", academicLevelId: "", schoolId: "", programId: "",
  solutionText: "", solutionFileUrl: "",
};

function toForm(e: Exam): Form {
  return {
    id: e.id, title: e.title, slug: e.slug, description: e.description ?? "", year: e.year?.toString() ?? "",
    category: e.category ?? "", fileUrl: e.fileUrl ?? "", status: e.status, isPremium: e.isPremium,
    subjectId: e.subjectId ?? "", academicLevelId: e.academicLevelId ?? "", schoolId: e.schoolId ?? "",
    programId: e.programId ?? "", solutionText: e.solution?.text ?? "", solutionFileUrl: e.solution?.fileUrl ?? "",
  };
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180);
}

export default function ExamsManager({ initialExams, initialSubjects, initialLevels, initialSchools, initialPrograms }: {
  initialExams: Exam[]; initialSubjects: Option[]; initialLevels: Option[]; initialSchools: Option[]; initialPrograms: Option[];
}) {
  const [exams, setExams] = useState(initialExams);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [levels, setLevels] = useState(initialLevels);
  const [schools, setSchools] = useState(initialSchools);
  const [programs, setPrograms] = useState(initialPrograms);
  const [form, setForm] = useState<Form>(empty);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => exams.filter((e) => {
    const haystack = [e.title, e.slug, e.category, e.subject?.name, e.academicLevel?.name, e.school?.name, e.program?.name].filter(Boolean).join(" ").toLowerCase();
    return (!filter || haystack.includes(filter.toLowerCase())) && (statusFilter === "ALL" || e.status === statusFilter);
  }), [exams, filter, statusFilter]);

  async function refresh() {
    const res = await fetch("/api/admin/exams", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Impossible de charger les épreuves.");
    setExams(data.exams); setSubjects(data.subjects); setLevels(data.levels); setSchools(data.schools); setPrograms(data.programs);
  }

  function startNew() {
    setForm(empty); setMessage(""); setOpen(true);
  }

  function edit(e: Exam) {
    setForm(toForm(e)); setMessage(""); setOpen(true);
  }

  async function save() {
    setMessage("");
    const payload = {
      ...form,
      year: form.year ? Number(form.year) : null,
      description: form.description || null,
      category: form.category || null,
      fileUrl: form.fileUrl || null,
      subjectId: form.subjectId || null,
      academicLevelId: form.academicLevelId || null,
      schoolId: form.schoolId || null,
      programId: form.programId || null,
      solutionText: form.solutionText || null,
      solutionFileUrl: form.solutionFileUrl || null,
    };
    const res = await fetch("/api/admin/exams", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || "Une erreur est survenue."); return; }
    setMessage("Épreuve enregistrée."); await refresh(); setOpen(false);
  }

  async function remove(id: string) {
    if (!confirm("Supprimer définitivement cette épreuve ?")) return;
    const res = await fetch("/api/admin/exams", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || "Suppression impossible."); return; }
    await refresh();
  }

  function field<K extends keyof Form>(key: K, value: Form[K]) { setForm((f) => ({ ...f, [key]: value })); }

  return <div>
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 gap-2">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Rechercher une épreuve..." className="w-full rounded-xl border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
          <option value="ALL">Tous</option><option value="DRAFT">Brouillons</option><option value="PUBLISHED">Publiées</option><option value="ARCHIVED">Archivées</option>
        </select>
      </div>
      <button onClick={startNew} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white">+ Nouvelle épreuve</button>
    </div>

    {message && <p className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800">{message}</p>}

    {open && <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{form.id ? "Modifier l’épreuve" : "Nouvelle épreuve"}</h2><button onClick={() => setOpen(false)} className="text-sm text-slate-500">Fermer</button></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">Titre<input value={form.title} onChange={(e) => field("title", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-sm font-medium">Slug<input value={form.slug} onChange={(e) => field("slug", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /><button type="button" onClick={() => field("slug", slugify(form.title))} className="mt-1 text-xs font-semibold text-sky-600">Générer depuis le titre</button></label>
        <label className="text-sm font-medium">Année<input type="number" value={form.year} onChange={(e) => field("year", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="2025" /></label>
        <label className="text-sm font-medium">Catégorie<input value={form.category} onChange={(e) => field("category", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Ancien sujet, BEPC, BAC..." /></label>
        <label className="text-sm font-medium">Matière<select value={form.subjectId} onChange={(e) => field("subjectId", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="">Non précisée</option>{subjects.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="text-sm font-medium">Niveau<select value={form.academicLevelId} onChange={(e) => field("academicLevelId", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="">Non précisé</option>{levels.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="text-sm font-medium">Établissement<select value={form.schoolId} onChange={(e) => field("schoolId", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="">Non précisé</option>{schools.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="text-sm font-medium">Filière / série<select value={form.programId} onChange={(e) => field("programId", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="">Non précisée</option>{programs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="text-sm font-medium md:col-span-2">Lien du sujet (PDF)<input value={form.fileUrl} onChange={(e) => field("fileUrl", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="https://..." /></label>
        <label className="text-sm font-medium md:col-span-2">Description<textarea value={form.description} onChange={(e) => field("description", e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-sm font-medium md:col-span-2">Correction / solution<textarea value={form.solutionText} onChange={(e) => field("solutionText", e.target.value)} className="mt-1 min-h-32 w-full rounded-xl border px-3 py-2" placeholder="Correction détaillée ou indications..." /></label>
        <label className="text-sm font-medium md:col-span-2">Lien de la correction (PDF)<input value={form.solutionFileUrl} onChange={(e) => field("solutionFileUrl", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="https://..." /></label>
        <label className="text-sm font-medium">Statut<select value={form.status} onChange={(e) => field("status", e.target.value as Form["status"])} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="DRAFT">Brouillon</option><option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option></select></label>
        <label className="flex items-center gap-2 pt-7 text-sm font-medium"><input type="checkbox" checked={form.isPremium} onChange={(e) => field("isPremium", e.target.checked)} /> Épreuve Premium</label>
      </div>
      <div className="mt-5 flex gap-2"><button onClick={save} className="rounded-xl bg-sky-600 px-5 py-2 font-bold text-white">Enregistrer</button><button onClick={() => setOpen(false)} className="rounded-xl border px-5 py-2 font-bold">Annuler</button></div>
    </section>}

    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Épreuve</th><th className="px-5 py-4">Matière / niveau</th><th className="px-5 py-4">Année</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4">Correction</th><th className="px-5 py-4">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{filtered.map(e=><tr key={e.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="font-semibold">{e.title}</div><div className="text-xs text-slate-400">{e.category || "Sans catégorie"}</div></td><td className="px-5 py-4">{e.subject?.name || "—"}<div className="text-xs text-slate-400">{e.academicLevel?.name || "—"}</div></td><td className="px-5 py-4">{e.year || "—"}</td><td className="px-5 py-4">{e.status}</td><td className="px-5 py-4">{e.solution ? "Oui" : "Non"}</td><td className="px-5 py-4"><div className="flex gap-2"><button onClick={() => edit(e)} className="rounded-lg border px-3 py-1.5 font-semibold">Modifier</button><button onClick={() => remove(e.id)} className="rounded-lg border border-red-200 px-3 py-1.5 font-semibold text-red-600">Supprimer</button></div></td></tr>)}</tbody>
      </table></div>
      {!filtered.length && <p className="px-5 py-12 text-center text-slate-500">Aucune épreuve ne correspond à la recherche.</p>}
    </div>
  </div>;
}

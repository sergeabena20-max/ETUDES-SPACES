"use client";

import { useMemo, useState } from "react";

type Option = { id: string; name: string };
type Question = {
  id?: string; question: string; optionA: string; optionB: string; optionC: string; optionD: string;
  correctOption: "A" | "B" | "C" | "D"; explanation: string | null; order: number;
};
type Quiz = {
  id: string; title: string; slug: string; description: string | null; status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  subjectId: string | null; academicLevelId: string | null; programId: string | null;
  subject?: Option | null; academicLevel?: Option | null; program?: Option | null; questions: Question[];
};
type Form = Omit<Quiz, "id" | "subject" | "academicLevel" | "program" | "questions"> & { id?: string; questions: Question[] };

const blankQuestion = (): Question => ({ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "A", explanation: "", order: 0 });
const empty: Form = { title: "", slug: "", description: "", status: "DRAFT", subjectId: "", academicLevelId: "", programId: "", questions: [] };

function slugify(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180);
}

export default function QuizzesManager({ initialQuizzes, initialSubjects, initialLevels, initialPrograms }: {
  initialQuizzes: Quiz[]; initialSubjects: Option[]; initialLevels: Option[]; initialPrograms: Option[];
}) {
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [levels, setLevels] = useState(initialLevels);
  const [programs, setPrograms] = useState(initialPrograms);
  const [form, setForm] = useState<Form>(empty);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => quizzes.filter((q) => {
    const text = [q.title, q.subject?.name, q.academicLevel?.name, q.program?.name].filter(Boolean).join(" ").toLowerCase();
    return (!filter || text.includes(filter.toLowerCase())) && (statusFilter === "ALL" || q.status === statusFilter);
  }), [quizzes, filter, statusFilter]);

  async function refresh() {
    const res = await fetch("/api/admin/quizzes", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Impossible de charger les quiz.");
    setQuizzes(data.quizzes); setSubjects(data.subjects); setLevels(data.levels); setPrograms(data.programs);
  }
  function startNew() { setForm({ ...empty, questions: [] }); setMessage(""); setOpen(true); }
  function edit(q: Quiz) { setForm({ id: q.id, title: q.title, slug: q.slug, description: q.description ?? "", status: q.status, subjectId: q.subjectId ?? "", academicLevelId: q.academicLevelId ?? "", programId: q.programId ?? "", questions: q.questions.map((x) => ({ ...x, explanation: x.explanation ?? "" })) }); setMessage(""); setOpen(true); }
  function field<K extends keyof Form>(key: K, value: Form[K]) { setForm((f) => ({ ...f, [key]: value })); }
  function updateQuestion(index: number, key: keyof Question, value: string) {
    setForm((f) => ({ ...f, questions: f.questions.map((q, i) => i === index ? { ...q, [key]: value } : q) }));
  }
  function addQuestion() { setForm((f) => ({ ...f, questions: [...f.questions, blankQuestion()] })); }
  function removeQuestion(index: number) { setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== index) })); }

  async function save() {
    setMessage("");
    if (!form.title.trim() || !form.slug.trim()) { setMessage("Le titre et le slug sont obligatoires."); return; }
    if (form.status === "PUBLISHED" && !form.questions.length) { setMessage("Ajoute au moins une question avant de publier."); return; }
    const res = await fetch("/api/admin/quizzes", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, description: form.description || null, subjectId: form.subjectId || null, academicLevelId: form.academicLevelId || null, programId: form.programId || null, questions: form.questions.map((q, i) => ({ ...q, explanation: q.explanation || null, order: i })) }),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || "Une erreur est survenue."); return; }
    await refresh(); setOpen(false); setMessage("Quiz enregistré.");
  }

  async function remove(id: string) {
    if (!confirm("Supprimer définitivement ce quiz et ses questions ?")) return;
    const res = await fetch("/api/admin/quizzes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || "Suppression impossible."); return; }
    await refresh();
  }

  return <div>
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 gap-2">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Rechercher un quiz..." className="w-full rounded-xl border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="ALL">Tous</option><option value="DRAFT">Brouillons</option><option value="PUBLISHED">Publiés</option><option value="ARCHIVED">Archivés</option></select>
      </div>
      <button onClick={startNew} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white">+ Nouveau petit test</button>
    </div>

    {message && <p className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800">{message}</p>}

    {open && <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">{form.id ? "Modifier le test" : "Nouveau petit test"}</h2><p className="text-sm text-slate-500">On pourra ajouter d'autres niveaux et filières plus tard.</p></div><button onClick={() => setOpen(false)} className="text-sm text-slate-500">Fermer</button></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">Titre<input value={form.title} onChange={(e) => field("title", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Petit test de mathématiques" /></label>
        <label className="text-sm font-medium">Slug<input value={form.slug} onChange={(e) => field("slug", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /><button type="button" onClick={() => field("slug", slugify(form.title))} className="mt-1 text-xs font-semibold text-sky-600">Générer depuis le titre</button></label>
        <label className="text-sm font-medium">Matière<select value={form.subjectId} onChange={(e) => field("subjectId", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="">Toutes / non précisée</option>{subjects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="text-sm font-medium">Niveau<select value={form.academicLevelId} onChange={(e) => field("academicLevelId", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="">Tous / non précisé</option>{levels.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="text-sm font-medium">Filière / série<select value={form.programId} onChange={(e) => field("programId", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="">Toutes / non précisée</option>{programs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="text-sm font-medium">Statut<select value={form.status} onChange={(e) => field("status", e.target.value as Form["status"])} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="DRAFT">Brouillon</option><option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option></select></label>
        <label className="text-sm font-medium md:col-span-2">Description<textarea value={form.description ?? ""} onChange={(e) => field("description", e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border px-3 py-2" /></label>
      </div>

      <div className="mt-7 flex items-center justify-between"><div><h3 className="text-lg font-bold">Questions ({form.questions.length})</h3><p className="text-sm text-slate-500">4 réponses possibles, une seule bonne réponse.</p></div><button onClick={addQuestion} className="rounded-xl border px-4 py-2 text-sm font-bold">+ Ajouter une question</button></div>
      <div className="mt-4 space-y-4">
        {form.questions.map((q, index) => <article key={q.id ?? index} className="rounded-2xl border bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between"><span className="font-bold">Question {index + 1}</span><button onClick={() => removeQuestion(index)} className="text-sm font-semibold text-red-600">Supprimer</button></div>
          <textarea value={q.question} onChange={(e) => updateQuestion(index, "question", e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="Écris la question..." />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(["A","B","C","D"] as const).map((letter) => <label key={letter} className="text-sm font-medium">{letter}<input value={q["option" + letter as "optionA" | "optionB" | "optionC" | "optionD"]} onChange={(e) => updateQuestion(index, ("option" + letter) as keyof Question, e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>)}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium">Bonne réponse<select value={q.correctOption} onChange={(e) => updateQuestion(index, "correctOption", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></label>
            <label className="text-sm font-medium">Explication (facultative)<input value={q.explanation ?? ""} onChange={(e) => updateQuestion(index, "explanation", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
          </div>
        </article>)}
        {!form.questions.length && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Commence par ajouter quelques questions.</div>}
      </div>
      <div className="mt-5 flex gap-2"><button onClick={save} className="rounded-xl bg-sky-600 px-5 py-2 font-bold text-white">Enregistrer</button><button onClick={() => setOpen(false)} className="rounded-xl border px-5 py-2 font-bold">Annuler</button></div>
    </section>}

    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Quiz</th><th className="px-5 py-4">Matière / niveau</th><th className="px-5 py-4">Filière</th><th className="px-5 py-4">Questions</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4">Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{filtered.map(q => <tr key={q.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="font-semibold">{q.title}</div><div className="text-xs text-slate-400">{q.description || "Petit test"}</div></td><td className="px-5 py-4">{q.subject?.name || "—"}<div className="text-xs text-slate-400">{q.academicLevel?.name || "Tous niveaux"}</div></td><td className="px-5 py-4">{q.program?.name || "Toutes"}</td><td className="px-5 py-4">{q.questions.length}</td><td className="px-5 py-4">{q.status}</td><td className="px-5 py-4"><div className="flex gap-2"><button onClick={() => edit(q)} className="rounded-lg border px-3 py-1.5 font-semibold">Modifier</button><button onClick={() => remove(q.id)} className="rounded-lg border border-red-200 px-3 py-1.5 font-semibold text-red-600">Supprimer</button></div></td></tr>)}</tbody></table></div>
      {!filtered.length && <p className="px-5 py-12 text-center text-slate-500">Aucun petit test pour le moment.</p>}
    </div>
  </div>;
}

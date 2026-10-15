"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Option = { id: string; name: string; kind?: string | null };
type InboxExam = { id: string; title: string; slug: string; fileUrl: string | null; createdAt: string };
type Target = "ELEVE" | "ETUDIANT";

async function readApiResponse(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (response.status === 413 || /request entity too large|payload too large|function_payload_too_large/i.test(text)) {
      throw new Error("Le fichier dépasse la limite d’envoi de Vercel. L’envoi direct vers Supabase est activé dans cette version ; si ce message persiste, actualise la page et réessaie.");
    }
    throw new Error(text.slice(0, 220) || "Le serveur a renvoyé une réponse illisible.");
  }
}
const categories: Record<Target, { value: string; label: string }[]> = {
  ELEVE: [
    { value: "EXERCICE", label: "Exercice" },
    { value: "ANCIEN_SUJET", label: "Ancien sujet d'examen" },
    { value: "EXAMEN_BLANC", label: "Examen blanc" },
    { value: "AUTRE", label: "Autre" },
  ],
  ETUDIANT: [
    { value: "EXERCICE", label: "Exercice" },
    { value: "CONTROLE_CONTINU", label: "Contrôle continu (CC)" },
    { value: "SESSION_NORMALE", label: "Session normale" },
    { value: "SIMULATION_BTS_DUT", label: "Simulation BTS / DUT" },
  ],
};

export default function ExamInboxManager({ levels, subjects, schools, programs, initialExams }: {
  levels: Option[]; subjects: Option[]; schools: Option[]; programs: Option[]; initialExams: InboxExam[];
}) {
  const [exams, setExams] = useState(initialExams);
  const [selected, setSelected] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [solutionFiles, setSolutionFiles] = useState<Record<string, File | undefined>>({});
  const [targetType, setTargetType] = useState<Target>("ELEVE");
  const [academicLevelId, setAcademicLevelId] = useState("");
  const [category, setCategory] = useState("EXERCICE");
  const [subjectId, setSubjectId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [programId, setProgramId] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const visibleLevels = useMemo(() => levels.filter((level) => targetType === "ELEVE"
    ? level.kind !== "UNIVERSITAIRE" && !["Licence 1", "Licence 2", "Licence 3"].includes(level.name)
    : level.kind === "UNIVERSITAIRE" || ["Licence 1", "Licence 2", "Licence 3"].includes(level.name)), [levels, targetType]);
  const visibleExams = useMemo(() => exams.filter((exam) => exam.title.toLowerCase().includes(search.toLowerCase())), [exams, search]);

  function changeTarget(value: Target) {
    setTargetType(value);
    setAcademicLevelId("");
    setProgramId("");
    setCategory("EXERCICE");
  }

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function refresh() {
    const response = await fetch("/api/admin/exams/inbox", { cache: "no-store" });
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.error || "Impossible de charger la bibliothèque.");
    setExams(data.exams);
    setSelected([]);
  }

  async function upload() {
    setMessage("");
    if (!files.length) { setMessage("Sélectionne au moins un PDF."); return; }
    if (files.length > 20) { setMessage("Tu peux ajouter 20 fichiers maximum par envoi."); return; }
    if (files.some((file) => !file.name.toLowerCase().endsWith(".pdf") || file.size > 50 * 1024 * 1024 || file.size === 0)) {
      setMessage("Chaque fichier doit être un PDF valide de 50 Mo maximum.");
      return;
    }
    setBusy(true);
    try {
      // Seuls les noms et tailles passent par Vercel ; les octets PDF vont du navigateur à Supabase.
      const prepareResponse = await fetch("/api/admin/exams/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          files: files.map((file) => ({ name: file.name, size: file.size, type: file.type || "application/pdf" })),
        }),
      });
      const prepared = await readApiResponse(prepareResponse);
      if (!prepareResponse.ok) throw new Error(prepared.error || "Impossible de préparer l’import.");

      const uploaded: { name: string; storagePath: string }[] = [];
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const destination = prepared.uploads?.[index];
        if (!destination?.signedUrl || !destination?.storagePath) {
          throw new Error("Supabase n’a pas fourni de lien d’envoi pour « " + file.name + " ».");
        }
        const storageResponse = await fetch(destination.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/pdf", "x-upsert": "false" },
          body: file,
        });
        if (!storageResponse.ok) {
          const detail = await storageResponse.text().catch(() => "");
          throw new Error("Échec de l’envoi de « " + file.name + " » vers Supabase (" + storageResponse.status + "). " + detail.slice(0, 160));
        }
        uploaded.push({ name: file.name, storagePath: destination.storagePath });
        setMessage("Envoi vers Supabase : " + uploaded.length + "/" + files.length + " PDF…");
      }

      const finalizeResponse = await fetch("/api/admin/exams/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", files: uploaded }),
      });
      const result = await readApiResponse(finalizeResponse);
      if (!finalizeResponse.ok) throw new Error(result.error || "Les PDF sont envoyés, mais leur ajout à la bibliothèque a échoué.");
      setMessage(result.count + " fichier(s) ajouté(s) à la bibliothèque. Tu peux les classer maintenant ou plus tard.");
      setFiles([]);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur réseau pendant l'import.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadSolution(examId: string) {
    const file = solutionFiles[examId];
    setMessage("");
    if (!file) { setMessage("Choisis le PDF du corrigé à associer à cette épreuve."); return; }
    if (!file.name.toLowerCase().endsWith(".pdf") || file.size <= 0 || file.size > 50 * 1024 * 1024) {
      setMessage("Le corrigé doit être un PDF valide de 50 Mo maximum.");
      return;
    }
    setBusy(true);
    try {
      const prepareResponse = await fetch("/api/admin/exams/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prepareSolution", files: [{ name: file.name, size: file.size, type: file.type || "application/pdf" }] }),
      });
      const prepared = await readApiResponse(prepareResponse);
      if (!prepareResponse.ok) throw new Error(prepared.error || "Impossible de préparer l'envoi du corrigé.");
      const destination = prepared.uploads?.[0];
      if (!destination?.signedUrl || !destination?.storagePath) throw new Error("Supabase n'a pas fourni de lien d'envoi pour le corrigé.");
      const uploadResponse = await fetch(destination.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf", "x-upsert": "false" },
        body: file,
      });
      if (!uploadResponse.ok) {
        const detail = await uploadResponse.text().catch(() => "");
        throw new Error("Échec de l'envoi du corrigé vers Supabase (" + uploadResponse.status + "). " + detail.slice(0, 160));
      }
      const finalizeResponse = await fetch("/api/admin/exams/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalizeSolution", examId, files: [{ name: file.name, storagePath: destination.storagePath }] }),
      });
      const result = await readApiResponse(finalizeResponse);
      if (!finalizeResponse.ok) throw new Error(result.error || "Le corrigé a été envoyé, mais son association a échoué.");
      setMessage("Corrigé associé à « " + (exams.find((exam) => exam.id === examId)?.title || "l'épreuve") + " ».");
      setSolutionFiles((current) => ({ ...current, [examId]: undefined }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur réseau pendant l'import du corrigé.");
    } finally {
      setBusy(false);
    }
  }

  async function classify() {
    setMessage("");
    if (!selected.length) { setMessage("Coche au moins un fichier à classer."); return; }
    if (!academicLevelId) { setMessage("Choisis la classe ou le niveau universitaire."); return; }
    if (targetType === "ETUDIANT" && !programId) { setMessage("Choisis la filière des étudiants."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/exams/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selected, targetType, academicLevelId, category, subjectId, schoolId, programId,
          year: year || null, status,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Classement impossible.");
      setMessage(data.count + " épreuve(s) classée(s) avec succès" + (status === "PUBLISHED" ? " et publiée(s)." : "."));
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur réseau pendant le classement.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/exams" className="text-sm font-semibold text-sky-700">← Retour à la gestion des épreuves</Link>
      <header className="mt-5">
        <p className="text-sm font-bold text-sky-600">Études Space · Administration</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">Bibliothèque des épreuves à classer</h1>
        <p className="mt-3 max-w-3xl text-slate-600">Dépose tes PDF en une seule fois, même si tu ne connais pas encore leur rubrique. Ils restent en attente ici jusqu’à ce que tu les classes dans la bonne classe, filière et matière.</p>
      </header>

      <section className="mt-7 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">1. Ajouter des PDF à la bibliothèque</h2>
        <p className="mt-1 text-sm text-slate-500">Jusqu’à 20 PDF par envoi · 50 Mo maximum par fichier · les fichiers ne sont pas publiés à cette étape.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="file" accept="application/pdf,.pdf" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} className="block min-w-0 flex-1 rounded-xl border bg-slate-50 p-3 text-sm" />
          <button onClick={upload} disabled={busy || !files.length} className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Traitement…" : "Ajouter " + files.length + " fichier(s)"}</button>
        </div>
        {files.length > 0 && <div className="mt-3 max-h-28 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{files.map((file, index) => <p key={file.name + index}>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} Mo</p>)}</div>}
      </section>

      <section className="mt-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-lg font-bold">2. Classer les fichiers</h2><p className="mt-1 text-sm text-slate-500">Sélectionne un seul fichier pour le classer individuellement, ou plusieurs pour appliquer les mêmes informations à tout le lot.</p></div>
          <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-800">{exams.length} en attente</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold">Public<select value={targetType} onChange={(event) => changeTarget(event.target.value as Target)} className="mt-1.5 w-full rounded-xl border p-3"><option value="ELEVE">Élève</option><option value="ETUDIANT">Étudiant</option></select></label>
          <label className="text-sm font-semibold">{targetType === "ELEVE" ? "Classe / série" : "Niveau universitaire"}<select value={academicLevelId} onChange={(event) => setAcademicLevelId(event.target.value)} className="mt-1.5 w-full rounded-xl border p-3"><option value="">Sélectionner</option>{visibleLevels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-semibold">Rubrique<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 w-full rounded-xl border p-3">{categories[targetType].map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          {targetType === "ETUDIANT" && <label className="text-sm font-semibold">Filière<select value={programId} onChange={(event) => setProgramId(event.target.value)} className="mt-1.5 w-full rounded-xl border p-3"><option value="">Sélectionner</option>{programs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          <label className="text-sm font-semibold">Matière<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1.5 w-full rounded-xl border p-3"><option value="">Non précisée</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-semibold">Établissement<select value={schoolId} onChange={(event) => setSchoolId(event.target.value)} className="mt-1.5 w-full rounded-xl border p-3"><option value="">Non précisé</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-semibold">Année de l’épreuve<input type="number" min="1900" max="2100" value={year} onChange={(event) => setYear(event.target.value)} placeholder="Ex. 2025" className="mt-1.5 w-full rounded-xl border p-3" /></label>
          <label className="text-sm font-semibold">Après classement<select value={status} onChange={(event) => setStatus(event.target.value as "DRAFT" | "PUBLISHED" | "ARCHIVED")} className="mt-1.5 w-full rounded-xl border p-3"><option value="DRAFT">Garder en brouillon</option><option value="PUBLISHED">Publier immédiatement</option><option value="ARCHIVED">Archiver</option></select></label>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un fichier…" className="w-full rounded-xl border px-4 py-3 text-sm sm:max-w-sm" />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelected(visibleExams.length && visibleExams.every((exam) => selected.includes(exam.id)) ? selected.filter((id) => !visibleExams.some((exam) => exam.id === id)) : Array.from(new Set([...selected, ...visibleExams.map((exam) => exam.id)])))} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Sélectionner la liste</button>
            <button onClick={classify} disabled={busy || !selected.length} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Enregistrement…" : "Classer la sélection (" + selected.length + ")"}</button>
          </div>
        </div>

        {message && <p role="status" className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}

        <div className="mt-4 overflow-hidden rounded-xl border">
          {visibleExams.length ? visibleExams.map((exam) => <div key={exam.id} className="flex items-start gap-3 border-b p-4 last:border-b-0 hover:bg-slate-50">
            <input type="checkbox" checked={selected.includes(exam.id)} onChange={() => toggle(exam.id)} aria-label={"Sélectionner " + exam.title} className="mt-1 h-4 w-4" />
            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold text-slate-900">{exam.title}</p>
              <p className="mt-1 text-xs text-slate-500">Ajouté le {new Date(exam.createdAt).toLocaleDateString("fr-FR")}</p>
            </div>
            <div className="flex max-w-xs flex-col gap-2">
              {exam.fileUrl && <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50">Voir le sujet ↗</a>}
              <input type="file" accept="application/pdf,.pdf" aria-label={"Choisir le corrigé pour " + exam.title} onChange={(event) => setSolutionFiles((current) => ({ ...current, [exam.id]: event.target.files?.[0] }))} className="w-full text-xs" />
              <button type="button" onClick={() => uploadSolution(exam.id)} disabled={busy || !solutionFiles[exam.id]} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-50">Importer le corrigé</button>
            </div>
          </div>) : <p className="px-4 py-12 text-center text-sm text-slate-500">{search ? "Aucun fichier ne correspond à cette recherche." : "La bibliothèque est vide. Ajoute des PDF ci-dessus pour commencer."}</p>}
        </div>
        <p className="mt-3 text-xs text-slate-500">Les épreuves publiées quittent automatiquement cette bibliothèque et rejoignent leur rubrique dans le catalogue.</p>
      </section>
    </div>
  </main>;
}

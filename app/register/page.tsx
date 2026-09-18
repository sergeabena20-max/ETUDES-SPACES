"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const ELEVE_LEVELS = ["6e", "5e", "4e", "3e", "Seconde", "Première", "Terminale"];
const ELEVE_PROGRAMS = ["A", "C", "D", "TI", "Autre"];
const ETUDIANT_LEVELS = ["Licence 1", "Licence 2", "Licence 3", "Master 1", "Master 2", "Doctorat", "Autre"];

export default function RegisterPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"ELEVE" | "ETUDIANT" | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Inscription impossible."); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="grid min-h-screen place-items-center px-4 py-8">
    <div className="card w-full max-w-3xl p-7">
      <Link href="/" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link>
      <h1 className="mt-8 text-3xl font-black">Créer mon compte</h1>
      <p className="mt-2 text-slate-500">Renseigne ton profil pour recevoir des contenus adaptés à ton parcours.</p>

      <form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">
        <input name="firstName" required placeholder="Prénom" className="rounded-xl border p-3" />
        <input name="lastName" required placeholder="Nom" className="rounded-xl border p-3" />
        <input name="email" type="email" required placeholder="Adresse e-mail" className="rounded-xl border p-3 sm:col-span-2" />
        <input name="password" type="password" minLength={8} required placeholder="Mot de passe (8 caractères min.)" className="rounded-xl border p-3" />
        <input name="confirmPassword" type="password" minLength={8} required placeholder="Confirmer le mot de passe" className="rounded-xl border p-3" />

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-bold">Je suis</label>
          <select name="studentStatus" required value={status} onChange={(e) => setStatus(e.target.value as "ELEVE" | "ETUDIANT")} className="w-full rounded-xl border p-3">
            <option value="">Sélectionner mon profil</option>
            <option value="ELEVE">Élève</option>
            <option value="ETUDIANT">Étudiant</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-bold">Nom de mon établissement</label>
          <input name="schoolName" required placeholder="Ex. Lycée Général Leclerc / Université de Yaoundé I" className="w-full rounded-xl border p-3" />
          <p className="mt-1 text-xs text-slate-500">Écris le nom officiel de ton établissement.</p>
        </div>

        {status && <div>
          <label className="mb-2 block text-sm font-bold">{status === "ELEVE" ? "Niveau scolaire" : "Niveau académique"}</label>
          <select name="academicLevelName" required className="w-full rounded-xl border p-3">
            <option value="">Sélectionner</option>
            {(status === "ELEVE" ? ELEVE_LEVELS : ETUDIANT_LEVELS).map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </div>}

        {status && <div>
          <label className="mb-2 block text-sm font-bold">{status === "ELEVE" ? "Série" : "Filière"}</label>
          <select name="programName" required className="w-full rounded-xl border p-3">
            <option value="">Sélectionner</option>
            {(status === "ELEVE" ? ELEVE_PROGRAMS : ["Informatique", "Génie logiciel", "Réseaux et télécommunications", "Gestion", "Droit", "Économie", "Médecine", "Autre"]).map((program) => <option key={program} value={program}>{program}</option>)}
          </select>
        </div>}

        {status && <div className="rounded-xl bg-sky-50 p-4 text-sm text-sky-800 sm:col-span-2">
          <strong>Ton profil</strong>
          <p className="mt-1">{status === "ELEVE" ? "Élève : ton niveau scolaire et ta série permettront de personnaliser les contenus proposés." : "Étudiant : ton niveau académique et ta filière permettront de personnaliser les contenus proposés."}</p>
        </div>}

        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <button disabled={loading} className="rounded-xl bg-sky-600 p-3 font-bold text-white sm:col-span-2 disabled:opacity-60">{loading ? "Création…" : "Créer mon compte"}</button>
      </form>
      <p className="mt-6 text-sm text-slate-500">Déjà inscrit ? <Link href="/login" className="font-bold text-sky-600">Se connecter</Link></p>
    </div>
  </main>;
}
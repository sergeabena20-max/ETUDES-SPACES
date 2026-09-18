"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Inscription impossible."); return; }
      router.push("/dashboard");
      router.refresh();
    } catch { setError("Impossible de contacter le serveur. Vérifie ta connexion."); }
    finally { setLoading(false); }
  }

  return <main className="grid min-h-screen place-items-center px-4 py-8"><div className="card w-full max-w-2xl p-7">
    <Link href="/" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link>
    <h1 className="mt-8 text-3xl font-black">Créer mon compte</h1>
    <p className="mt-2 text-slate-500">Un espace personnel pour apprendre et s&apos;entraîner.</p>
    <form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">
      <input name="firstName" required placeholder="Prénom" className="rounded-xl border p-3" />
      <input name="lastName" required placeholder="Nom" className="rounded-xl border p-3" />
      <input name="email" type="email" required placeholder="Adresse e-mail" className="rounded-xl border p-3 sm:col-span-2" />
      <input name="password" type="password" minLength={8} required placeholder="Mot de passe (8 caractères min.)" className="rounded-xl border p-3" />
      <input name="confirmPassword" type="password" minLength={8} required placeholder="Confirmer le mot de passe" className="rounded-xl border p-3" />
      <select name="studentStatus" required className="rounded-xl border p-3 sm:col-span-2">
        <option value="">Statut académique</option><option value="ELEVE">Élève</option><option value="ETUDIANT">Étudiant</option>
      </select>
      <div className="rounded-xl bg-sky-50 p-4 text-sm text-sky-800 sm:col-span-2">
        <strong>Profil académique</strong>
        <p className="mt-1">L&apos;établissement, le niveau et la filière seront configurables depuis ton espace personnel. Aucun identifiant technique n&apos;est demandé ici.</p>
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <button disabled={loading} className="rounded-xl bg-sky-600 p-3 font-bold text-white sm:col-span-2 disabled:opacity-60">{loading ? "Création…" : "Créer mon compte"}</button>
    </form>
    <p className="mt-6 text-sm text-slate-500">Déjà inscrit ? <Link href="/login" className="font-bold text-sky-600">Se connecter</Link></p>
  </div></main>;
}
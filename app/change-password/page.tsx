"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.get("password"), confirmPassword: form.get("confirmPassword") }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Modification impossible."); return; }
      setMessage(data.message || "Mot de passe modifié.");
      setTimeout(() => router.replace("/login"), 900);
    } catch { setError("Impossible de contacter le serveur."); }
    finally { setLoading(false); }
  }
  return <main className="grid min-h-screen place-items-center px-4 py-8"><section className="card w-full max-w-md p-7">
    <Link href="/" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link>
    <h1 className="mt-7 text-2xl font-black">Choisis un nouveau mot de passe</h1>
    <p className="mt-2 text-sm text-slate-500">L’administration a validé ta demande. Crée un nouveau mot de passe et confirme-le.</p>
    <form onSubmit={submit} className="mt-6 space-y-4">
      <input name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" placeholder="Nouveau mot de passe (8 caractères min.)" className="w-full rounded-xl border p-3" />
      <input name="confirmPassword" type="password" minLength={8} maxLength={128} required autoComplete="new-password" placeholder="Confirmer le nouveau mot de passe" className="w-full rounded-xl border p-3" />
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-sky-600 p-3 font-bold text-white disabled:opacity-60">{loading ? "Modification…" : "Confirmer le nouveau mot de passe"}</button>
    </form>
  </section></main>;
}

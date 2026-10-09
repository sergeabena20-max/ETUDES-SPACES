"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Demande impossible."); return; }
      setMessage(data.message || "Vérifie ta boîte e-mail et tes courriers indésirables.");
    } catch {
      setError("Impossible de contacter le serveur. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-8">
    <div className="card w-full max-w-md p-7">
      <Link href="/" className="inline-flex rounded-2xl bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700">🇨🇲 Études Space</Link>
      <h1 className="mt-7 text-3xl font-black">Mot de passe oublié ?</h1>
      <p className="mt-2 text-sm text-slate-500">Entre l’adresse e-mail associée à ton compte. Nous t’enverrons un lien sécurisé pour choisir un nouveau mot de passe.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Adresse e-mail" className="w-full rounded-xl border p-3" autoComplete="email" />
        {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-sky-600 p-3 font-bold text-white disabled:opacity-60">{loading ? "Envoi…" : "Envoyer le lien"}</button>
      </form>
      <Link href="/login" className="mt-6 inline-block text-sm font-bold text-sky-700">← Retour à la connexion</Link>
    </div>
  </main>;
}

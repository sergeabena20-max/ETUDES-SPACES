"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirmPassword) { setError("Les deux mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Réinitialisation impossible."); return; }
      setSuccess(data.message || "Mot de passe modifié.");
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setError("Impossible de contacter le serveur. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="grid min-h-screen place-items-center px-4 py-8">
    <div className="card w-full max-w-md p-7">
      <Link href="/" className="inline-flex rounded-2xl bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700">🇨🇲 Études Space</Link>
      <h1 className="mt-7 text-3xl font-black">Créer un nouveau mot de passe</h1>
      {!token ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">Le lien est incomplet. Demande une nouvelle réinitialisation.</p> : <form onSubmit={submit} className="mt-6 space-y-4">
        <input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nouveau mot de passe (8 caractères min.)" className="w-full rounded-xl border p-3" />
        <input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirmer le nouveau mot de passe" className="w-full rounded-xl border p-3" />
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-sky-600 p-3 font-bold text-white disabled:opacity-60">{loading ? "Modification…" : "Enregistrer le nouveau mot de passe"}</button>
      </form>}
      <Link href="/forgot-password" className="mt-6 inline-block text-sm font-bold text-sky-700">Demander un nouveau lien</Link>
    </div>
  </main>;
}

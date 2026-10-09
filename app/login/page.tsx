"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [loading,setLoading]=useState(false);
  useEffect(() => {
    if (window.location.search.includes("logged_out=1")) {
      setSuccess("Tu as été déconnecté avec succès.");
      window.history.replaceState({}, "", "/login");
    }
  }, []);
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data=Object.fromEntries(new FormData(e.currentTarget));
      const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      const j=await r.json();
      if(!r.ok){setError(j.error||"Connexion impossible.");return;}
      router.push("/dashboard");
    } catch {
      setError("Impossible de contacter le serveur. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }
  return <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-8">
    <div className="animate-float-slow pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl"/>
    <div className="animate-float pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl"/>
    <div className="card relative w-full max-w-md p-7">
      <div className="mb-6 inline-flex rounded-2xl bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700">🇨🇲 Études Space</div>
      <h1 className="mt-2 text-3xl font-black">Connexion</h1>
      <p className="mt-2 text-slate-500">Retrouve ton espace d'apprentissage.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <input name="email" type="email" required placeholder="Adresse e-mail" className="w-full rounded-xl border p-3"/>
        <input name="password" type="password" required placeholder="Mot de passe" className="w-full rounded-xl border p-3"/>
        <div className="-mt-2 text-right"><Link href="/forgot-password" className="text-sm font-semibold text-sky-600 hover:underline">Mot de passe oublié ?</Link></div>
        {success&&<p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
        {error&&<p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-sky-600 p-3 font-bold text-white shadow-lg shadow-sky-600/20 disabled:opacity-60">{loading?"Connexion…":"Se connecter →"}</button>
      </form>
      <p className="mt-6 text-sm text-slate-500">Pas encore de compte ? <Link href="/register" className="font-bold text-sky-600">Créer un compte</Link></p>
      <Link href="/" className="mt-4 inline-block text-sm font-semibold text-slate-500">← Retour à l'accueil</Link>
    </div>
  </main>;
}
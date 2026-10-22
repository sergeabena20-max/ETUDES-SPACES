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
      router.push(j.mustChangePassword ? "/change-password" : "/dashboard");
    } catch {
      setError("Impossible de contacter le serveur. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }
  return <main className="grid min-h-screen place-items-center bg-[#f8f7ff] px-4 py-8">
    <div className="animate-float-slow pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl"/>
    <div className="animate-float pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl"/>
    <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_18px_55px_rgba(20,37,61,.08)] sm:p-9">
      <Link href="/" className="mb-7 inline-flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[#4c1d95]"><img src="/icons/etudes-space.svg" alt="" className="h-full w-full object-cover" /></span><span className="text-lg font-extrabold tracking-tight text-[#202c38]">Etudes <span className="text-[#4c1d95]">Space</span></span></Link>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#202c38]">Bienvenue de nouveau</h1>
      <p className="mt-2 text-slate-500">Connecte-toi pour retrouver tes cours, tes épreuves et ta progression.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <input name="email" type="email" required placeholder="Adresse e-mail" className="w-full rounded-lg border border-slate-200 bg-white p-3.5 text-sm"/>
        <input name="password" type="password" required placeholder="Mot de passe" className="w-full rounded-xl border p-3"/>
        <div className="-mt-2 text-right"><Link href="/forgot-password" className="text-sm font-semibold text-[#4c1d95] hover:underline">Mot de passe oublié ?</Link></div>
        {success&&<p className="rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-700">{success}</p>}
        {error&&<p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-[#4c1d95] p-3.5 font-bold text-white hover:bg-[#5b21b6] disabled:opacity-60">{loading?"Connexion…":"Se connecter →"}</button>
      </form>
      <p className="mt-6 text-sm text-slate-500">Pas encore de compte ? <Link href="/register" className="font-bold text-[#4c1d95]">Créer un compte</Link></p>
      <Link href="/" className="mt-4 inline-block text-sm font-semibold text-slate-500">← Retour à l'accueil</Link>
    </div>
  </main>;
}
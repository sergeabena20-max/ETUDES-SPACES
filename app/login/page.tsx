"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter(); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>) { e.preventDefault(); setError(""); setLoading(true); const data=Object.fromEntries(new FormData(e.currentTarget)); const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}); const j=await r.json(); setLoading(false); if(!r.ok){setError(j.error||"Connexion impossible.");return;} router.push("/dashboard"); router.refresh(); }
  return <main className="grid min-h-screen place-items-center px-4"><div className="card w-full max-w-md p-7"><Link href="/" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link><h1 className="mt-8 text-3xl font-black">Connexion</h1><p className="mt-2 text-slate-500">Retrouve ton espace d'apprentissage.</p><form onSubmit={submit} className="mt-7 space-y-4"><input name="email" type="email" required placeholder="Adresse e-mail" className="w-full rounded-xl border p-3"/><input name="password" type="password" required placeholder="Mot de passe" className="w-full rounded-xl border p-3"/>{error&&<p className="text-sm text-red-600">{error}</p>}<button disabled={loading} className="w-full rounded-xl bg-sky-600 p-3 font-bold text-white disabled:opacity-60">{loading?"Connexion…":"Se connecter"}</button></form><p className="mt-6 text-sm text-slate-500">Pas encore de compte ? <Link href="/register" className="font-bold text-sky-600">Créer un compte</Link></p></div></main>;
}
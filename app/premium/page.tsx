"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function PremiumPage() {
  const router = useRouter();
  const [provider, setProvider] = useState("ORANGE_MONEY");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const r = await fetch("/api/premium/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, amount, reference, details }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Impossible d'envoyer la demande.");
        if (r.status === 401) router.push("/login");
        return;
      }
      setMessage("Demande envoyée. Le Super Admin ou un Admin autorisé vérifiera ton paiement puis activera Premium.");
      setReference("");
      setDetails("");
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl animate-float" />
      <section className="container relative z-10 max-w-3xl py-12">
        <Link href="/dashboard" className="text-sm font-semibold text-sky-600">← Mon espace</Link>
        <div className="card mt-5 p-7 sm:p-9">
          <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-black text-amber-700">⭐ PREMIUM</span>
          <h1 className="mt-4 text-4xl font-black">Activer mon accès Premium</h1>
          <p className="mt-3 text-slate-500">
            Effectue le paiement, puis envoie la référence de transaction ci-dessous. L'accès n'est activé qu'après validation par l'administration.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <p className="font-black text-orange-700">Orange Money</p>
              <p className="mt-2 text-lg font-black">692 86 06 95</p>
              <p className="text-sm text-slate-600">TCHOUPE NGASSA DANIELLA</p>
            </div>
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
              <p className="font-black text-yellow-800">MTN Mobile Money</p>
              <p className="mt-2 text-lg font-black">652 59 12 05</p>
              <p className="text-sm text-slate-600">TCHOUPE NGASSA DANIELLA</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            Après paiement, envoie la référence sur <strong>WhatsApp 692 86 06 95</strong> ou par SMS, en précisant ce que tu souhaites avec la transaction.
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full rounded-xl border p-3">
              <option value="ORANGE_MONEY">Orange Money</option>
              <option value="MTN_MOMO">MTN Mobile Money</option>
            </select>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" required placeholder="Montant payé (FCFA)" className="w-full rounded-xl border p-3" />
            <input value={reference} onChange={(e) => setReference(e.target.value)} required placeholder="Référence de transaction" className="w-full rounded-xl border p-3" />
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="Précise ce que tu souhaites avec cette transaction..." className="w-full rounded-xl border p-3" />
            {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-sky-600 p-3 font-bold text-white disabled:opacity-60">
              {loading ? "Envoi…" : "Envoyer ma demande de validation →"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

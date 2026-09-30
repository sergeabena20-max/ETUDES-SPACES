"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

type Settings = {
  enabled: boolean; premiumPrice: string; durationDays: number;
  orangeMoneyNumber: string; orangeMoneyName: string;
  mtnMomoNumber: string; mtnMomoName: string;
  whatsappNumber: string; paymentInstructions: string;
};

export default function PremiumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get("exam");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [exam, setExam] = useState<{ id: string; title: string; premiumPrice: string } | null>(null);
  const [provider, setProvider] = useState("ORANGE_MONEY");
  const [reference, setReference] = useState("");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/premium/settings", { cache: "no-store" });
      const d = await r.json();
      if (d.enabled !== false) setSettings(d);
      if (examId) {
        const er = await fetch("/api/premium/exam?id=" + encodeURIComponent(examId), { cache: "no-store" });
        const ed = await er.json();
        if (er.ok) setExam(ed);
      }
    })();
  }, [examId]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);
    try {
      const r = await fetch("/api/premium/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: exam ? "EXAM" : "PREMIUM_PLAN",
          examId: exam?.id || null,
          provider, reference, details,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Impossible d'envoyer la demande.");
        if (r.status === 401) router.push("/login");
        return;
      }
      setMessage("Demande envoyée. L'administration vérifiera la transaction avant l'activation.");
      setReference(""); setDetails("");
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally { setLoading(false); }
  }

  return <main className="relative min-h-screen overflow-hidden">
    <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl animate-float-slow" />
    <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl animate-float" />
    <section className="container relative z-10 max-w-3xl py-12">
      <Link href="/dashboard" className="text-sm font-semibold text-sky-600">← Mon espace</Link>
      <div className="card mt-5 p-7 sm:p-9">
        <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-black text-amber-700">⭐ PREMIUM</span>
        <h1 className="mt-4 text-4xl font-black">{exam ? "Acheter cette épreuve" : "Activer mon accès Premium"}</h1>
        <p className="mt-3 text-slate-500">{exam ? exam.title : "Effectue le paiement puis envoie la référence. L'accès n'est activé qu'après validation administrative."}</p>

        {settings && <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-sm font-semibold text-sky-700">Montant à payer</p>
          <p className="mt-1 text-3xl font-black text-sky-900">{exam ? Number(exam.premiumPrice).toLocaleString("fr-FR") : Number(settings.premiumPrice).toLocaleString("fr-FR")} FCFA</p>
          {!exam && <p className="mt-1 text-sm text-slate-600">Durée : {settings.durationDays} jours</p>}
        </div>}

        {settings && <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5"><p className="font-black text-orange-700">Orange Money</p><p className="mt-2 text-lg font-black">{settings.orangeMoneyNumber}</p><p className="text-sm text-slate-600">{settings.orangeMoneyName}</p></div>
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5"><p className="font-black text-yellow-800">MTN Mobile Money</p><p className="mt-2 text-lg font-black">{settings.mtnMomoNumber}</p><p className="text-sm text-slate-600">{settings.mtnMomoName}</p></div>
        </div>}

        {settings && <div className="mt-5 rounded-2xl border bg-slate-50 p-5 text-sm leading-6 text-slate-600">{settings.paymentInstructions} <strong>WhatsApp / SMS : {settings.whatsappNumber}</strong></div>}

        {!settings && <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Les paiements Premium ne sont pas encore configurés.</p>}

        {settings && <form onSubmit={submit} className="mt-7 space-y-4">
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full rounded-xl border p-3"><option value="ORANGE_MONEY">Orange Money</option><option value="MTN_MOMO">MTN Mobile Money</option></select>
          <input value={reference} onChange={(e) => setReference(e.target.value)} required placeholder="Référence de transaction" className="w-full rounded-xl border p-3" />
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="Précise ce que tu souhaites avec cette transaction..." className="w-full rounded-xl border p-3" />
          {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-sky-600 p-3 font-bold text-white disabled:opacity-60">{loading ? "Envoi…" : "Envoyer ma demande de validation →"}</button>
        </form>}
      </div>
    </section>
  </main>;
}

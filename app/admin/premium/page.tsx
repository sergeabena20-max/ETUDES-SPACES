"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Settings = {
  enabled: boolean; premiumPrice: string | number; durationDays: number;
  orangeMoneyNumber: string; orangeMoneyName: string;
  mtnMomoNumber: string; mtnMomoName: string;
  whatsappNumber: string; paymentInstructions: string;
};

const initial: Settings = {
  enabled: true, premiumPrice: 0, durationDays: 30,
  orangeMoneyNumber: "692860695", orangeMoneyName: "TCHOUPE NGASSA DANIELLA",
  mtnMomoNumber: "652591205", mtnMomoName: "TCHOUPE NGASSA DANIELLA",
  whatsappNumber: "692860695",
  paymentInstructions: "Après paiement, envoie la référence de transaction sur WhatsApp ou par SMS en précisant ce que tu souhaites avec la transaction.",
};

export default function PremiumSettingsPage() {
  const [form, setForm] = useState<Settings>(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/admin/premium-settings", { cache: "no-store" });
      const d = await r.json();
      if (r.ok && d.settings) setForm(d.settings);
      else setError(d.error || "Impossible de charger la configuration.");
    })();
  }, []);

  function field<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setLoading(true); setMessage(""); setError("");
    try {
      const r = await fetch("/api/admin/premium-settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Enregistrement impossible."); return; }
      setMessage("Configuration Premium enregistrée.");
      setForm(d.settings);
    } finally { setLoading(false); }
  }

  return <main className="relative min-h-screen overflow-hidden">
    <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl animate-float-slow" />
    <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl animate-float" />
    <section className="container relative z-10 max-w-4xl py-10">
      <Link href="/admin" className="text-sm font-semibold text-sky-600">← Administration</Link>
      <div className="card mt-5 p-7">
        <p className="text-sm font-bold text-sky-600">SUPER ADMIN · PREMIUM</p>
        <h1 className="mt-2 text-4xl font-black">Configuration des paiements</h1>
        <p className="mt-2 text-slate-500">Ici, seul le Super Admin définit les règles commerciales et les coordonnées de paiement.</p>
        {message && <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
        {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border p-4 font-semibold"><input type="checkbox" checked={form.enabled} onChange={(e) => field("enabled", e.target.checked)} /> Premium activé</label>
          <label className="text-sm font-semibold">Prix Premium global (FCFA)<input type="number" min="0" value={form.premiumPrice} onChange={(e) => field("premiumPrice", e.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label>
          <label className="text-sm font-semibold">Durée Premium (jours)<input type="number" min="1" value={form.durationDays} onChange={(e) => field("durationDays", Number(e.target.value))} className="mt-1 w-full rounded-xl border p-3" /></label>
          <div className="rounded-xl border bg-slate-50 p-4 text-sm"><strong>Règle :</strong> le prix d'une épreuve peut être défini séparément dans sa fiche. L'utilisateur ne choisit jamais lui-même le tarif attendu.</div>
          <label className="text-sm font-semibold">Orange Money — numéro<input value={form.orangeMoneyNumber} onChange={(e) => field("orangeMoneyNumber", e.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label>
          <label className="text-sm font-semibold">Orange Money — nom<input value={form.orangeMoneyName} onChange={(e) => field("orangeMoneyName", e.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label>
          <label className="text-sm font-semibold">MTN MoMo — numéro<input value={form.mtnMomoNumber} onChange={(e) => field("mtnMomoNumber", e.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label>
          <label className="text-sm font-semibold">MTN MoMo — nom<input value={form.mtnMomoName} onChange={(e) => field("mtnMomoName", e.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label>
          <label className="text-sm font-semibold">WhatsApp / SMS<input value={form.whatsappNumber} onChange={(e) => field("whatsappNumber", e.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label>
          <label className="text-sm font-semibold md:col-span-2">Instructions de paiement<textarea value={form.paymentInstructions} onChange={(e) => field("paymentInstructions", e.target.value)} rows={4} className="mt-1 w-full rounded-xl border p-3" /></label>
        </div>
        <button onClick={save} disabled={loading} className="mt-6 rounded-xl bg-sky-600 px-6 py-3 font-bold text-white disabled:opacity-50">{loading ? "Enregistrement…" : "Enregistrer la configuration"}</button>
      </div>
    </section>
  </main>;
}

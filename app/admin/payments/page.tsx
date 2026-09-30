"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Payment = {
  id: string;
  amount: string | number;
  currency: string;
  provider: string | null;
  status: string;
  externalId: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState("");

  async function load() {
    const r = await fetch("/api/admin/payments");
    const data = await r.json();
    if (!r.ok) {
      setError(data.error || "Accès refusé.");
      return;
    }
    setPayments(data.payments || []);
  }

  useEffect(() => { void load(); }, []);

  async function act(id: string, action: "approve" | "reject") {
    setLoadingId(id);
    setError("");
    try {
      const r = await fetch("/api/admin/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Action impossible.");
        return;
      }
      await load();
    } finally {
      setLoadingId("");
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <Link href="/admin" className="font-black">← Administration</Link>
          <Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link>
        </div>
      </header>
      <section className="container py-10">
        <p className="text-sm font-semibold text-sky-600">💳 Premium</p>
        <h1 className="mt-2 text-4xl font-black">Paiements à vérifier</h1>
        <p className="mt-2 text-slate-500">Valide uniquement les transactions réellement vérifiées.</p>
        {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="mt-8 space-y-4">
          {payments.length === 0 && <div className="card p-7 text-slate-500">Aucune demande de paiement.</div>}
          {payments.map((p) => (
            <article key={p.id} className="card p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div>
                  <p className="font-black">{p.user.firstName} {p.user.lastName}</p>
                  <p className="text-sm text-slate-500">{p.user.email}</p>
                  <p className="mt-3 text-sm"><strong>{p.amount} {p.currency}</strong> · {p.provider || "—"} · Référence : <strong>{p.externalId || "—"}</strong></p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(p.createdAt).toLocaleString("fr-FR")}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className={"rounded-full px-3 py-1 text-xs font-bold " + (p.status === "approved" ? "bg-emerald-50 text-emerald-700" : p.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>{p.status}</span>
                  {p.status === "pending" && <>
                    <button disabled={loadingId === p.id} onClick={() => act(p.id, "approve")} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Activer</button>
                    <button disabled={loadingId === p.id} onClick={() => act(p.id, "reject")} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50">Refuser</button>
                  </>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

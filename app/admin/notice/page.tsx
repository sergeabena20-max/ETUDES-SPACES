"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Notice = {
  enabled: boolean;
  type: "INFO" | "WARNING" | "MAINTENANCE" | "SUCCESS";
  audience: "BEFORE_LOGIN" | "AFTER_LOGIN" | "BOTH";
  title: string;
  message: string;
};

const defaults: Notice = {
  enabled: false,
  type: "INFO",
  audience: "BOTH",
  title: "Information",
  message: "Nous rencontrons actuellement un problème technique. Notre équipe travaille à rétablir le service.",
};

export default function AdminNoticePage() {
  const [notice, setNotice] = useState<Notice>(defaults);
  const [message, setMessage] = useState("Chargement...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/site-notice", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Accès refusé.");
        if (data.notice) setNotice(data.notice);
        setMessage("");
      })
      .catch((error) => setMessage(error.message));
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/site-notice", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notice),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error || "Enregistrement impossible.");
      return;
    }
    setNotice(data.notice);
    setMessage("Message mis à jour.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50/60">
      <div className="pointer-events-none absolute -left-32 top-16 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl animate-float" />
      <div className="pointer-events-none absolute right-[15%] top-24 h-3 w-3 rounded-full bg-sky-400 shadow-[0_0_28px_8px_rgba(56,189,248,.3)] animate-orbit" />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/admin" className="rounded-xl px-3 py-2 text-sm font-semibold text-sky-600 transition hover:bg-white hover:shadow-sm">← Administration</Link>
        <div className="mt-4 animate-slide-up">
          <p className="text-sm font-semibold text-sky-600">Super Administration</p>
          <h1 className="mt-1 text-3xl font-black sm:text-4xl">Message aux utilisateurs</h1>
          <p className="mt-2 text-slate-500">Choisis précisément qui voit le message : avant connexion, après connexion, ou les deux.</p>
        </div>

        <section className="card mt-8 animate-slide-up stagger-2 p-6">
          <label className="flex items-center gap-3 font-bold">
            <input type="checkbox" checked={notice.enabled} onChange={(e) => setNotice({ ...notice, enabled: e.target.checked })} />
            Afficher le message
          </label>

          <div className="mt-6 grid gap-5">
            <label className="text-sm font-semibold">
              Où afficher le message ?
              <select value={notice.audience} onChange={(e) => setNotice({ ...notice, audience: e.target.value as Notice["audience"] })} className="mt-1 w-full rounded-xl border px-3 py-2">
                <option value="BEFORE_LOGIN">Avant connexion uniquement</option>
                <option value="AFTER_LOGIN">Après connexion uniquement</option>
                <option value="BOTH">Avant et après connexion</option>
              </select>
            </label>

            <label className="text-sm font-semibold">
              Type
              <select value={notice.type} onChange={(e) => setNotice({ ...notice, type: e.target.value as Notice["type"] })} className="mt-1 w-full rounded-xl border px-3 py-2">
                <option value="INFO">Information</option>
                <option value="WARNING">Avertissement</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SUCCESS">Information positive</option>
              </select>
            </label>

            <label className="text-sm font-semibold">
              Titre
              <input value={notice.title} onChange={(e) => setNotice({ ...notice, title: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>

            <label className="text-sm font-semibold">
              Message
              <textarea value={notice.message} onChange={(e) => setNotice({ ...notice, message: e.target.value })} className="mt-1 min-h-32 w-full rounded-xl border px-3 py-2" />
            </label>

            {notice.enabled && (
              <div className="animate-pulse-soft rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                  Aperçu · {notice.audience === "BOTH" ? "les deux côtés" : notice.audience === "BEFORE_LOGIN" ? "avant connexion" : "après connexion"}
                </p>
                <strong className="mt-1 block">{notice.title}</strong>
                <p className="mt-1">{notice.message}</p>
              </div>
            )}

            {message && <p className="text-sm text-slate-600">{message}</p>}
            <button onClick={save} disabled={saving} className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white shadow-lg shadow-sky-600/20 disabled:opacity-50">
              {saving ? "Enregistrement..." : "Enregistrer le message"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

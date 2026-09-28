"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Notice = {
  enabled: boolean;
  type: "INFO" | "WARNING" | "MAINTENANCE" | "SUCCESS";
  title: string;
  message: string;
};

const defaults: Notice = {
  enabled: false,
  type: "INFO",
  title: "Information",
  message: "Nous rencontrons actuellement un problème technique. Notre équipe travaille à rétablir le service.",
};

export default function AdminNoticePage() {
  const [notice, setNotice] = useState(defaults);
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
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/admin" className="text-sm font-semibold text-sky-600">← Administration</Link>
        <div className="mt-3">
          <p className="text-sm font-semibold text-sky-600">Super Administration</p>
          <h1 className="mt-1 text-3xl font-black">Message aux utilisateurs</h1>
          <p className="mt-2 text-slate-500">
            Affichez une information globale lorsqu'un service rencontre un problème ou pendant une maintenance.
          </p>
        </div>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <label className="flex items-center gap-3 font-bold">
            <input type="checkbox" checked={notice.enabled} onChange={(e) => setNotice({ ...notice, enabled: e.target.checked })} />
            Afficher le message sur le site
          </label>

          <div className="mt-6 grid gap-5">
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
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm">
                <strong>{notice.title}</strong>
                <p className="mt-1">{notice.message}</p>
              </div>
            )}

            {message && <p className="text-sm text-slate-600">{message}</p>}
            <button onClick={save} disabled={saving} className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-50">
              {saving ? "Enregistrement..." : "Enregistrer le message"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

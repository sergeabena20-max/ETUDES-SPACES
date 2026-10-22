"use client";

import { useEffect, useState } from "react";

export default function PwaInstallSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/pwa-install", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Impossible de charger le réglage.");
        setEnabled(Boolean(data.enabled));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(next: boolean) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/pwa-install", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Enregistrement impossible.");
      setEnabled(Boolean(data.enabled));
      setMessage(next ? "La bannière sera affichée aux utilisateurs éligibles." : "La bannière est désactivée pour tous les utilisateurs.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="card mt-6 p-6">
    <p className="text-sm font-bold text-[#7c3aed]">Expérience utilisateur</p>
    <h2 className="mt-1 text-2xl font-black">Installation de l’application</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Tu contrôles ici la bannière d’installation pour toute la plateforme. Désactivée, elle ne s’affiche plus chez les utilisateurs. Activée, elle s’affiche seulement sur les appareils compatibles qui ne l’ont pas déjà installée.</p>
    <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <span className={"inline-flex rounded-full px-3 py-1 text-xs font-extrabold " + (enabled ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-600")}>{loading ? "CHARGEMENT…" : enabled ? "ACTIVÉE" : "DÉSACTIVÉE"}</span>
        <p className="mt-2 font-bold">{enabled ? "La bannière est autorisée" : "La bannière est masquée"}</p>
      </div>
      <button type="button" disabled={loading || saving} onClick={() => void toggle(!enabled)} className={"min-h-11 rounded-xl px-5 py-3 text-sm font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 " + (enabled ? "bg-slate-700 hover:bg-slate-800" : "bg-[#4c1d95] hover:bg-[#5b21b6]")}>{saving ? "Enregistrement…" : enabled ? "Désactiver pour tous" : "Activer pour tous"}</button>
    </div>
    {message && <p role="status" className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">{message}</p>}
  </section>;
}

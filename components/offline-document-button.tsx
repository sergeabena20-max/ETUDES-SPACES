"use client";
import { useState } from "react";
export default function OfflineDocumentButton({ url, label = "Enregistrer hors connexion" }: { url: string; label?: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function save() {
    if (!("caches" in window)) { setState("error"); return; }
    setState("saving");
    try {
      const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("Téléchargement impossible");
      const cache = await caches.open("etudes-space-documents-v1");
      await cache.put(new Request(new URL(url, window.location.origin).href), response.clone());
      setState("saved");
    } catch { setState("error"); }
  }
  return <button type="button" onClick={() => void save()} disabled={state === "saving"} className="rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50 disabled:opacity-60">
    {state === "saving" ? "Enregistrement…" : state === "saved" ? "✓ Disponible hors connexion" : state === "error" ? "Réessayer l’enregistrement" : "⇩ " + label}
  </button>;
}

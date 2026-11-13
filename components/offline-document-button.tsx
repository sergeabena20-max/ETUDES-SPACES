"use client";
import { useState } from "react";

const CACHE_NAME = "etudes-space-documents-v1";
const MAX_DOCUMENTS = 20;

export default function OfflineDocumentButton({ url, label = "Enregistrer hors connexion" }: { url: string; label?: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error" | "limit">("idle");
  async function save() {
    if (!( "caches" in window) || !("serviceWorker" in navigator)) { setState("error"); return; }
    setState("saving");
    try {
      const absoluteUrl = new URL(url, window.location.origin).href;
      const cache = await caches.open(CACHE_NAME);
      const existing = await cache.match(absoluteUrl);
      if (!existing) {
        const keys = await cache.keys();
        if (keys.length >= MAX_DOCUMENTS) { setState("limit"); return; }
      }
      const response = await fetch(absoluteUrl, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok || response.type === "opaque") throw new Error("Téléchargement impossible");
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("pdf") && !contentType.toLowerCase().includes("octet-stream")) {
        throw new Error("Le fichier reçu n'est pas un PDF");
      }
      await cache.put(absoluteUrl, response.clone());
      setState("saved");
    } catch { setState("error"); }
  }
  return <div className="flex flex-col items-start gap-1">
    <button type="button" onClick={() => void save()} disabled={state === "saving"} className="rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50 disabled:opacity-60">
      {state === "saving" ? "Enregistrement…" : state === "saved" ? "✓ Disponible hors connexion" : state === "limit" ? "Limite atteinte (20 PDF)" : state === "error" ? "Échec — réessayer" : "⇩ " + label}
    </button>
    {state === "limit" && <span className="text-xs text-amber-700">Supprime un ancien document depuis « Mes épreuves hors connexion » pour libérer une place.</span>}
    {state === "error" && <span className="text-xs text-red-600">Vérifie ta connexion et réessaie.</span>}
  </div>;
}

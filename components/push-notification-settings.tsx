"use client";

import { useEffect, useState } from "react";

type PushState = "checking" | "unsupported" | "enabled" | "disabled" | "busy";

function decodeVapidKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export default function PushNotificationSettings() {
  const [state, setState] = useState<PushState>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (active) setState("unsupported");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (active) setState(subscription ? "enabled" : "disabled");
      } catch {
        if (active) setState("disabled");
      }
    }
    void check();
    return () => { active = false; };
  }, []);

  async function toggleNotifications() {
    setState("busy");
    setMessage("");
    try {
      if (Notification.permission === "denied") {
        throw new Error("Les notifications sont bloquées dans les paramètres du navigateur. Autorise-les puis réessaie.");
      }
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Tu n'as pas autorisé les notifications.");

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const response = await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error((await response.json()).error || "Impossible de désactiver les notifications.");
        await subscription.unsubscribe();
        setState("disabled");
        setMessage("Les notifications sont désactivées sur cet appareil.");
        return;
      }

      const keyResponse = await fetch("/api/push/subscribe");
      const keyData = await keyResponse.json();
      if (!keyResponse.ok || !keyData.publicKey) throw new Error(keyData.error || "Configuration VAPID indisponible.");

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(keyData.publicKey) as BufferSource,
      });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) {
        await subscription.unsubscribe();
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Impossible d'enregistrer cet appareil.");
      }
      setState("enabled");
      setMessage("Les notifications sont activées sur cet appareil.");
    } catch (error) {
      setState("disabled");
      setMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  }

  return (
    <section aria-labelledby="push-settings-title">
      <h2 id="push-settings-title" className="text-lg font-bold">Notifications</h2>
      <p className="mt-2 text-sm text-slate-500">
        Reçois une alerte lorsqu'une nouvelle épreuve est publiée pour ta classe.
      </p>
      {state === "unsupported" ? (
        <p className="mt-3 text-sm text-amber-700">Ce navigateur ne prend pas en charge les notifications push. Essaie avec Chrome ou Edge à jour.</p>
      ) : (
        <button
          type="button"
          onClick={toggleNotifications}
          disabled={state === "checking" || state === "busy"}
          className="mt-4 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "busy" ? "Patiente..." : state === "enabled" ? "Désactiver les notifications sur cet appareil" : "Activer les notifications"}
        </button>
      )}
      {message && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}
      <p className="mt-3 text-xs text-slate-400">L'autorisation est demandée uniquement lorsque tu cliques sur le bouton. Chaque appareil doit être activé séparément.</p>
    </section>
  );
}

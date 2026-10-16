"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsInstalled(standalone);
    setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (isInstalled) return null;
  if (!installEvent && !isIOS) return null;

  async function install() {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setInstallEvent(null);
      }
      return;
    }
    setShowIOSHelp((value) => !value);
  }

  return (
    <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-sky-200 bg-white/95 p-4 shadow-2xl shadow-sky-900/15 backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:right-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sky-100">
          <img src="/icons/icon-192.png" alt="" className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-slate-900">Installer Études Space</p>
          <p className="text-sm text-slate-600">Retrouve l’application depuis ton écran d’accueil ou ton menu.</p>
        </div>
        <button onClick={install} className="shrink-0 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700">
          Installer
        </button>
      </div>
      {isIOS && showIOSHelp && (
        <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm leading-6 text-slate-700">
          Sur iPhone ou iPad : ouvre ce site dans Safari, appuie sur <strong>Partager</strong>, puis sur <strong>Sur l’écran d’accueil</strong> et confirme avec <strong>Ajouter</strong>.
        </p>
      )}
    </aside>
  );
}

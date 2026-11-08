"use client";

import { useState } from "react";
import { LogOut, X } from "lucide-react";

export default function LogoutReminder() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-3 pt-2 sm:px-6">
      <div className="flex items-start gap-2 rounded-lg border border-violet-200/80 bg-violet-50/80 px-3 py-2 text-sm text-violet-950 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-100">
        <LogOut className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden="true" />
        <p className="min-w-0 flex-1 leading-5">
          <span className="font-semibold">Petit rappel de sécurité :</span>{" "}
          pensez à vous déconnecter après chaque utilisation, surtout sur un appareil partagé.
        </p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Fermer le rappel"
          title="Fermer"
          className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-violet-700 transition hover:bg-violet-100 hover:text-violet-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200 dark:hover:bg-violet-400/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

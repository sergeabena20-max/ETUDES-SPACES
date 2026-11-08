"use client";

import { useState } from "react";

export default function LogoutReminder() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-3 pt-2 sm:px-6">
      <div className="flex items-start gap-2 rounded-lg border border-violet-200/80 bg-violet-50/80 px-3 py-2 text-sm text-violet-950 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-100">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" />
        </svg>
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
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

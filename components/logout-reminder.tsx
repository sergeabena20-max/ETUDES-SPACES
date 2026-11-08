"use client";

import { useState } from "react";

export default function LogoutReminder() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full py-2">
      <div
        role="note"
        className="flex items-start gap-2 rounded-xl border-2 border-violet-500 bg-violet-100 px-3 py-3 text-left text-sm text-violet-950 shadow-sm"
      >
        <svg className="mt-0.5 h-5 w-5 shrink-0 text-violet-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" />
        </svg>
        <p className="min-w-0 flex-1 font-medium leading-5">
          <span className="font-extrabold">Rappel de sécurité :</span>{" "}
          déconnectez-vous après chaque utilisation, surtout sur un appareil partagé, pour protéger votre compte.
        </p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Fermer le rappel"
          title="Fermer"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-violet-950 hover:bg-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

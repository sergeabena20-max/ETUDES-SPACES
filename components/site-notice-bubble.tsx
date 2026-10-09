"use client";

import { useState } from "react";

type Notice = {
  type: "INFO" | "WARNING" | "MAINTENANCE" | "SUCCESS";
  title: string;
  message: string;
};

export default function SiteNoticeBubble({ notice }: { notice: Notice }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const isSuccess = notice.type === "SUCCESS";
  const isInfo = notice.type === "INFO";
  const icon = notice.type === "MAINTENANCE" ? "⚙" : isSuccess ? "✓" : isInfo ? "i" : "!";
  const label = notice.type === "MAINTENANCE"
    ? "MAINTENANCE"
    : notice.type === "WARNING"
      ? "À SAVOIR"
      : isSuccess
        ? "INFORMATION"
        : "INFO";

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] w-[min(320px,calc(100vw-2rem))] animate-slide-up"
    >
      <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-white shadow-[0_12px_36px_rgba(127,29,29,0.18)]">
        <div className="absolute inset-y-0 left-0 w-1 bg-red-500" />
        <div className="flex items-start gap-3 p-3 pl-4">
          <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-black text-red-600 ring-1 ring-red-200">
            {icon}
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold tracking-[0.14em] text-red-600">{label}</span>
              <span className="h-1 w-1 rounded-full bg-red-300" />
              <span className="text-[10px] font-medium text-slate-400">Études Space</span>
            </div>
            <p className="mt-1 text-sm font-bold leading-5 text-slate-900">{notice.title}</p>
            <p className="mt-1 whitespace-pre-line break-words text-xs leading-5 text-slate-600">{notice.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
            aria-label="Fermer le message"
          >
            ×
          </button>
        </div>
      </div>
    </aside>
  );
}

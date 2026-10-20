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

  const palette = notice.type === "WARNING" || notice.type === "MAINTENANCE"
    ? { border: "border-amber-200", rail: "bg-amber-500", iconBg: "bg-amber-50", icon: "text-amber-700", ring: "ring-amber-200", label: "text-amber-700", dot: "bg-amber-500", hover: "hover:bg-amber-50 hover:text-amber-700" }
    : notice.type === "SUCCESS"
      ? { border: "border-emerald-200", rail: "bg-emerald-500", iconBg: "bg-emerald-50", icon: "text-emerald-700", ring: "ring-emerald-200", label: "text-emerald-700", dot: "bg-emerald-500", hover: "hover:bg-emerald-50 hover:text-emerald-700" }
      : { border: "border-[#dce8dc]", rail: "bg-[#3e8062]", iconBg: "bg-[#e9f3ee]", icon: "text-[#2f7658]", ring: "ring-[#dce8dc]", label: "text-[#2f7658]", dot: "bg-[#3e8062]", hover: "hover:bg-[#e9f3ee] hover:text-[#193b35]" };

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-4 z-[110] w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 animate-slide-up"
    >
      <div className={`relative overflow-hidden rounded-2xl border bg-white shadow-[0_12px_36px_rgba(32,44,56,0.14)] ${palette.border}`}>
        <div className={`absolute inset-y-0 left-0 w-1 ${palette.rail}`} />
        <div className="flex items-start gap-3 p-4 pl-5 sm:p-5">
          <span className={`relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ring-1 ${palette.iconBg} ${palette.icon} ${palette.ring}`}>
            {icon}
            <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${palette.dot}`} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-extrabold tracking-[0.14em] ${palette.label}`}>{label}</span>
              <span className={`h-1 w-1 rounded-full ${palette.dot}`} />
              <span className="text-[10px] font-medium text-slate-400">Etudes Space</span>
            </div>
            <p className="mt-1 text-base font-extrabold leading-6 text-slate-900">{notice.title}</p>
            <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-slate-700">{notice.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className={`-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none text-slate-400 transition ${palette.hover} focus:outline-none focus:ring-2 focus:ring-slate-300`}
            aria-label="Fermer le message"
          >
            ×
          </button>
        </div>
      </div>
    </aside>
  );
}

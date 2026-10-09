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

  const theme = notice.type === "MAINTENANCE"
    ? "notice-bubble--maintenance"
    : notice.type === "WARNING"
      ? "notice-bubble--warning"
      : notice.type === "SUCCESS"
        ? "notice-bubble--success"
        : "notice-bubble--info";

  return (
    <aside className={"notice-bubble " + theme} role="status" aria-live="polite">
      <span className="notice-bubble__orb" aria-hidden="true" />
      <div className="notice-bubble__icon" aria-hidden="true">
        {notice.type === "MAINTENANCE" ? "🛠️" : notice.type === "WARNING" ? "⚠️" : notice.type === "SUCCESS" ? "✓" : "ℹ️"}
      </div>
      <div className="notice-bubble__body">
        <p className="notice-bubble__eyebrow">{notice.type === "MAINTENANCE" ? "Information de maintenance" : notice.type === "WARNING" ? "Avertissement" : notice.type === "SUCCESS" ? "Bonne nouvelle" : "Information"}</p>
        <p className="notice-bubble__title">{notice.title}</p>
        <p className="notice-bubble__message">{notice.message}</p>
      </div>
      <button type="button" onClick={() => setVisible(false)} className="notice-bubble__close" aria-label="Fermer le message">×</button>
    </aside>
  );
}

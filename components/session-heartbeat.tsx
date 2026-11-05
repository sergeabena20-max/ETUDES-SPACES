"use client";

import { useEffect } from "react";

/** Keeps the current login alive while the browser is actively connected. */
export default function SessionHeartbeat() {
  useEffect(() => {
    let redirecting = false;

    const ping = async () => {
      if (redirecting || document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/auth/heartbeat", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
        });
        if (response.status === 401 && !redirecting) {
          redirecting = true;
          window.location.replace("/login?reason=session-expired");
        }
      } catch {
        // A temporary network loss is tolerated; the server-side 2-minute timeout remains authoritative.
      }
    };

    void ping();
    const timer = window.setInterval(() => void ping(), 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void ping();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}

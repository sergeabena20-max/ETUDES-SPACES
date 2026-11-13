"use client";

import { useEffect } from "react";

export default function PwaServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("pwa_service_worker_registration", error);
    });
    return () => { active = false; void active; };
  }, []);
  return null;
}

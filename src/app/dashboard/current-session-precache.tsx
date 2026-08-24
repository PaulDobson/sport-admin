"use client";

import { useEffect } from "react";

export function CurrentSessionPrecache({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({
        type: "PRECACHE_CURRENT_SESSION",
        url: `/dashboard/sessions/${sessionId}/attendance`,
      });
    });
  }, [sessionId]);

  return null;
}

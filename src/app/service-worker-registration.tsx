"use client";

import { useEffect } from "react";

/** Registers the versioned app-shell service worker; renders nothing. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) {
            if (registration.scope.startsWith(window.location.origin)) {
              void registration.unregister();
            }
          }
        })
        .catch((error) => {
          console.error("Service worker cleanup failed", error);
        });

      if ("caches" in window) {
        caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((key) => key.startsWith("sport-admin-"))
                .map((key) => caches.delete(key)),
            ),
          )
          .catch((error) => {
            console.error("Service worker cache cleanup failed", error);
          });
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  return null;
}

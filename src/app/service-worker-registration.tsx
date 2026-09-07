"use client";

import { useEffect } from "react";

/** Registers the versioned app-shell service worker; renders nothing. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    const cleanupDevelopmentWorker =
      process.env.NODE_ENV !== "production"
        ? navigator.serviceWorker
            .getRegistrations()
            .then((registrations) =>
              Promise.all(
                registrations
                  .filter((registration) =>
                    registration.scope.startsWith(window.location.origin),
                  )
                  .map((registration) => registration.unregister()),
              ),
            )
            .then(() => {
              if (!("caches" in window)) return;
              return caches
                .keys()
                .then((keys) =>
                  Promise.all(
                    keys
                      .filter((key) => key.startsWith("sport-admin-"))
                      .map((key) => caches.delete(key)),
                  ),
                );
            })
        : Promise.resolve();

    cleanupDevelopmentWorker
      .then(() => navigator.serviceWorker.register("/sw.js"))
      .catch((error) => {
        console.error("Service worker registration failed", error);
      });
  }, []);

  return null;
}

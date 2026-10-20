"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function SessionContextRefresh({
  boundaryTimes,
}: {
  boundaryTimes: string[];
}) {
  const router = useRouter();

  // Serialize the array to a stable primitive so the effect only re-runs when
  // the actual ISO strings change, not when the parent creates a new array
  // reference on every render. This prevents spurious timer re-registrations
  // and the associated listener leak pattern.
  const serialized = boundaryTimes.join(",");

  // Keep a stable ref to router.refresh to avoid it appearing in the dep array.
  const refreshRef = useRef(router.refresh.bind(router));
  useEffect(() => {
    refreshRef.current = router.refresh.bind(router);
  }, [router]);

  useEffect(() => {
    const refresh = () => refreshRef.current();
    const times = serialized
      .split(",")
      .filter(Boolean)
      .map((value) => Date.parse(value))
      .filter((time) => time > Date.now());

    const timers = times.map((time) =>
      window.setTimeout(refresh, time - Date.now()),
    );

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);

    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [serialized]);

  return null;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SessionContextRefresh({
  boundaryTimes,
}: {
  boundaryTimes: string[];
}) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();
    const timers = boundaryTimes
      .map((value) => Date.parse(value))
      .filter((time) => time > Date.now())
      .map((time) => window.setTimeout(refresh, time - Date.now()));

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [boundaryTimes, router]);

  return null;
}

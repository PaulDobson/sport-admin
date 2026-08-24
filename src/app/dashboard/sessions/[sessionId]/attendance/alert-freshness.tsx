"use client";

import { useEffect, useState } from "react";

export const MEDICAL_COPY_MAX_AGE_MS = 60 * 60 * 1000;

export function AlertFreshness({ checkedAt }: { checkedAt: string }) {
  const [ageMs, setAgeMs] = useState<number | null>(null);

  useEffect(() => {
    const updateAge = () =>
      setAgeMs(Date.now() - new Date(checkedAt).getTime());
    updateAge();
    const interval = window.setInterval(updateAge, 60_000);
    return () => window.clearInterval(interval);
  }, [checkedAt]);

  if (ageMs === null) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Comprobando frescura de alertas...
      </p>
    );
  }

  const minutes = Math.max(0, Math.floor(ageMs / 60_000));
  if (ageMs > MEDICAL_COPY_MAX_AGE_MS) {
    return (
      <p role="alert" className="mt-2 text-sm font-semibold text-warning">
        Copia médica de hace {minutes} min. Verifica manualmente con el alumno
        antes de iniciar.
      </p>
    );
  }

  return (
    <p className="mt-2 text-xs text-muted-foreground">
      Alertas verificadas hace {minutes} min.
    </p>
  );
}

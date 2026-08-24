"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resynchronizeSession } from "@/application/synchronization/use-cases/resynchronize-session";
import { createSessionResynchronizationDeps } from "@/infrastructure/composition/synchronization-composition";
import { createSupabaseBrowserClient } from "@/infrastructure/supabase/browser-client";

export function SessionRealtimeRefresh({
  tenantId,
  sessionId,
}: {
  tenantId: string;
  sessionId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    let running = false;
    const resynchronize = async () => {
      if (!navigator.onLine || running) return;
      running = true;
      const deps = createSessionResynchronizationDeps();
      try {
        const result = await resynchronizeSession(
          { tenantId, sessionId },
          deps,
        );
        if (result.changed) router.refresh();
      } finally {
        await deps.offlineStore.close();
        running = false;
      }
    };
    const channel = client
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_realtime_events",
          filter: `session_id=eq.${sessionId}`,
        },
        () => void resynchronize(),
      )
      .subscribe();
    void resynchronize();
    window.addEventListener("online", resynchronize);

    return () => {
      window.removeEventListener("online", resynchronize);
      void client.removeChannel(channel);
    };
  }, [router, sessionId, tenantId]);

  return null;
}

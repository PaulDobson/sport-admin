import type { OfflineStorePort } from "@/application/synchronization/ports/offline-store-port";
import type { SessionResyncTransportPort } from "@/application/synchronization/ports/session-resync-transport-port";

interface SessionCursor {
  lastEventId: number;
}

export async function resynchronizeSession(
  input: { tenantId: string; sessionId: string },
  deps: {
    offlineStore: OfflineStorePort;
    transport: SessionResyncTransportPort;
    now?: () => Date;
  },
) {
  const cursorId = `sync-cursor:${input.sessionId}`;
  const cached = await deps.offlineStore.get<SessionCursor>(
    "sessions",
    input.tenantId,
    cursorId,
  );
  let lastEventId = cached?.payload.lastEventId ?? 0;
  const changes = [];
  for (;;) {
    const page = await deps.transport.listChanges(input.sessionId, lastEventId);
    if (page.length === 0) break;
    changes.push(...page);
    const nextEventId = Math.max(...page.map((event) => event.id));
    if (nextEventId <= lastEventId) break;
    lastEventId = nextEventId;
  }
  if (changes.length === 0) return { changed: false, recovered: 0 };

  const now = (deps.now ?? (() => new Date()))();
  await deps.offlineStore.put("sessions", {
    id: cursorId,
    tenantId: input.tenantId,
    payload: { lastEventId },
    updatedAt: changes.at(-1)?.occurredAt ?? now,
    cachedAt: now,
  });
  return { changed: true, recovered: changes.length };
}

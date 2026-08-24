import type {
  SessionChangeEvent,
  SessionResyncTransportPort,
} from "@/application/synchronization/ports/session-resync-transport-port";

export class FetchSessionResyncTransport implements SessionResyncTransportPort {
  async listChanges(sessionId: string, afterId: number) {
    const query = new URLSearchParams({ after: String(afterId) });
    const response = await fetch(
      `/api/synchronization/sessions/${sessionId}/changes?${query}`,
    );
    if (!response.ok) throw new Error("Session resynchronization failed");
    const body = (await response.json()) as {
      events: Array<
        Omit<SessionChangeEvent, "occurredAt"> & { occurredAt: string }
      >;
    };
    return body.events.map((event) => ({
      ...event,
      occurredAt: new Date(event.occurredAt),
    }));
  }
}

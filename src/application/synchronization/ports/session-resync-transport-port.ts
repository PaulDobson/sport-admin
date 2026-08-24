export interface SessionChangeEvent {
  id: number;
  eventType: "attendance" | "alert";
  entityId: string;
  operation: "insert" | "update" | "delete";
  occurredAt: Date;
}

export interface SessionResyncTransportPort {
  listChanges(
    sessionId: string,
    afterId: number,
  ): Promise<SessionChangeEvent[]>;
}

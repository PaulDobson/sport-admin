import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createObservability } from "@/infrastructure/composition/observability-composition";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const startedAt = performance.now();
  const observability = createObservability();
  const record = (
    area: "realtime_resync" | "rls",
    outcome: "success" | "rejected" | "failure",
    errorCode?: string,
    itemCount?: number,
  ) =>
    observability.record({
      area,
      operation: "recover_events",
      outcome,
      durationMs: performance.now() - startedAt,
      errorCode,
      itemCount,
    });
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) {
    record("rls", "rejected", "UNAUTHENTICATED");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const memberships = await auth.memberships.findOperationalByUser(userId);
  if (memberships.length === 0) {
    record("rls", "rejected", "NO_ACTIVE_MEMBERSHIP");
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sessionId } = await params;
  const after = Number(new URL(request.url).searchParams.get("after") ?? "0");
  if (!Number.isSafeInteger(after) || after < 0) {
    record("realtime_resync", "rejected", "INVALID_CURSOR");
    return Response.json({ error: "Invalid cursor" }, { status: 400 });
  }

  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("session_realtime_events")
    .select("id,event_type,entity_id,operation,occurred_at")
    .eq("session_id", sessionId)
    .gt("id", after)
    .order("id")
    .limit(500);
  if (error) {
    const code = typeof error.code === "string" ? error.code : "QUERY_FAILED";
    record(
      code === "42501" ? "rls" : "realtime_resync",
      code === "42501" ? "rejected" : "failure",
      code,
    );
    return Response.json(
      { error: "Resynchronization failed" },
      { status: 500 },
    );
  }
  record("realtime_resync", "success", undefined, data?.length ?? 0);
  return Response.json({
    events: (data ?? []).map((event) => ({
      id: Number(event.id),
      eventType: event.event_type,
      entityId: event.entity_id,
      operation: event.operation,
      occurredAt: event.occurred_at,
    })),
  });
}

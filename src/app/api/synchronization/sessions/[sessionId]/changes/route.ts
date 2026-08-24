import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const memberships = await auth.memberships.findOperationalByUser(userId);
  if (memberships.length === 0)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { sessionId } = await params;
  const after = Number(new URL(request.url).searchParams.get("after") ?? "0");
  if (!Number.isSafeInteger(after) || after < 0) {
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
  if (error)
    return Response.json(
      { error: "Resynchronization failed" },
      { status: 500 },
    );
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

import { timingSafeEqual } from "node:crypto";
import { evaluateCollectionNotices } from "@/application/notifications/use-cases/evaluate-collection-notices";
import { processNextNotificationDelivery } from "@/application/notifications/use-cases/process-next-notification-delivery";
import { createNotificationDeliveryDeps } from "@/infrastructure/composition/notification-delivery-composition";
import { getNotificationWorkerSecret } from "@/infrastructure/supabase/env";

export const runtime = "nodejs";

const batchSize = 10;

function isAuthorized(request: Request) {
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer /, "");
  if (!supplied) return false;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(getNotificationWorkerSecret());
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deps = createNotificationDeliveryDeps();
  const results = [];
  try {
    const now = new Date();
    const emittedNotices = await evaluateCollectionNotices(
      { referenceDate: now.toISOString().slice(0, 10), renewalWindowDays: 7 },
      deps,
    );
    for (let index = 0; index < batchSize; index += 1) {
      const result = await processNextNotificationDelivery({ now }, deps);
      if (result.status === "idle") break;
      results.push(result);
    }
    return Response.json({
      emittedNotices,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Notification delivery processing failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      code:
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : undefined,
    });
    return Response.json(
      { error: "Notification processing failed" },
      { status: 500 },
    );
  }
}

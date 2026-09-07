import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { CollectionNoticeEvaluatorPort } from "@/application/notifications/ports/collection-notice-evaluator-port";

export class SupabaseCollectionNoticeEvaluator implements CollectionNoticeEvaluatorPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async evaluate(input: { referenceDate: string; renewalWindowDays: number }) {
    const { data, error } = await this.client.rpc(
      "evaluate_membership_collection_notices",
      {
        reference_date: input.referenceDate,
        renewal_window_days: input.renewalWindowDays,
      },
    );
    if (error) throw error;
    return Number(data ?? 0);
  }
}

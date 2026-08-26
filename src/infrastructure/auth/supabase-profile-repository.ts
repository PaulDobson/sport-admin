import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRepositoryPort } from "@/application/auth/ports/profile-repository-port";
import type { UserProfile } from "@/domain/shared/user-profile";

interface ProfileRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export class SupabaseProfileRepository implements ProfileRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async findByUserId(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("id,full_name,avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as ProfileRow;
    return {
      userId: row.id,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
    };
  }
}

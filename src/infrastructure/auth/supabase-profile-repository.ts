import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { ProfileRepositoryPort } from "@/application/auth/ports/profile-repository-port";
import type { UserProfile } from "@/domain/shared/user-profile";

interface ProfileRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export class SupabaseProfileRepository implements ProfileRepositoryPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

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

  async updateByUserId(
    userId: string,
    input: { fullName: string; avatarUrl: string | null },
  ): Promise<UserProfile> {
    const { data, error } = await this.client
      .from("profiles")
      .update({ full_name: input.fullName, avatar_url: input.avatarUrl })
      .eq("id", userId)
      .select("id,full_name,avatar_url")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Profile not found");
    const row = data as ProfileRow;
    return {
      userId: row.id,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
    };
  }
}

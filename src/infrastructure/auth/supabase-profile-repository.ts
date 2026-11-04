import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { ProfileRepositoryPort } from "@/application/auth/ports/profile-repository-port";
import type { UserProfile } from "@/domain/shared/user-profile";

interface ProfileRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
}

export class SupabaseProfileRepository implements ProfileRepositoryPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async findByUserId(userId: string): Promise<UserProfile | null> {
    // Use the RPC so we can include auth.users.email without granting direct
    // access to that table to the authenticated role.
    const { data, error } = await (this.client as any).rpc("get_my_profile");
    if (error) throw error;
    if (!data) return null;

    const row = data as unknown as ProfileRow;
    // Guard: the RPC is scoped to auth.uid(), so it must match the caller.
    if (row.id !== userId) return null;

    return {
      userId: row.id,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      phone: row.phone,
      email: row.email,
    };
  }

  async updateByUserId(
    userId: string,
    input: { fullName: string; avatarUrl: string | null; phone: string | null },
  ): Promise<UserProfile> {
    const { data, error } = await this.client
      .from("profiles")
      .update({
        full_name: input.fullName,
        avatar_url: input.avatarUrl,
        phone: input.phone,
      } as Parameters<ReturnType<SupabaseDatabaseClient["from"]>["update"]>[0])
      .eq("id", userId)
      .select("id,full_name,avatar_url,phone")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Profile not found");

    const row = data as unknown as Omit<ProfileRow, "email">;

    return {
      userId: row.id,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      phone: row.phone,
      // Email cannot change via a profile update; callers that need it should
      // call findByUserId() separately.
      email: null,
    };
  }
}

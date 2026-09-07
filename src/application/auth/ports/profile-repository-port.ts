import type { UserProfile } from "@/domain/shared/user-profile";

export interface ProfileRepositoryPort {
  findByUserId(userId: string): Promise<UserProfile | null>;
  updateByUserId(
    userId: string,
    input: { fullName: string; avatarUrl: string | null },
  ): Promise<UserProfile>;
}

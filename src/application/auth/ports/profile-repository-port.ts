import type { UserProfile } from "@/domain/shared/user-profile";

export interface ProfileRepositoryPort {
  findByUserId(userId: string): Promise<UserProfile | null>;
}

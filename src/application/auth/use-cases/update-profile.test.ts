import { describe, expect, it, vi } from "vitest";
import type { ProfileRepositoryPort } from "../ports/profile-repository-port";
import { updateProfile } from "./update-profile";

const userId = "10000000-0000-4000-8000-000000000001";

describe("updateProfile", () => {
  it("trims and persists supported profile fields for the authenticated user", async () => {
    const updateByUserId = vi.fn().mockResolvedValue({
      userId,
      fullName: "Ana Silva",
      avatarUrl: null,
    });
    const profiles: ProfileRepositoryPort = {
      findByUserId: vi.fn(),
      updateByUserId,
    };

    await expect(
      updateProfile(
        { userId, fullName: "  Ana Silva  ", avatarUrl: "" },
        { profiles },
      ),
    ).resolves.toMatchObject({ fullName: "Ana Silva", avatarUrl: null });
    expect(updateByUserId).toHaveBeenCalledWith(userId, {
      fullName: "Ana Silva",
      avatarUrl: null,
    });
  });

  it.each([
    { userId, fullName: "A", avatarUrl: null },
    { userId, fullName: "Valid Name", avatarUrl: "not-a-url" },
    { userId: "not-a-uuid", fullName: "Valid Name", avatarUrl: null },
  ])("rejects invalid profile input: $fullName", async (input) => {
    const profiles: ProfileRepositoryPort = {
      findByUserId: vi.fn(),
      updateByUserId: vi.fn(),
    };

    await expect(updateProfile(input, { profiles })).rejects.toThrow();
    expect(profiles.updateByUserId).not.toHaveBeenCalled();
  });
});

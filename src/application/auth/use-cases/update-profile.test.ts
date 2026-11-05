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
      phone: null,
      email: null,
    });
    const profiles: ProfileRepositoryPort = {
      findByUserId: vi.fn(),
      updateByUserId,
    };

    await expect(
      updateProfile(
        { userId, fullName: "  Ana Silva  ", avatarUrl: "", phone: null },
        { profiles },
      ),
    ).resolves.toMatchObject({ fullName: "Ana Silva", avatarUrl: null });
    expect(updateByUserId).toHaveBeenCalledWith(userId, {
      fullName: "Ana Silva",
      avatarUrl: null,
      phone: null,
    });
  });

  it("normalises an empty phone string to null", async () => {
    const updateByUserId = vi.fn().mockResolvedValue({
      userId,
      fullName: "Ana Silva",
      avatarUrl: null,
      phone: null,
      email: null,
    });
    const profiles: ProfileRepositoryPort = {
      findByUserId: vi.fn(),
      updateByUserId,
    };

    await updateProfile(
      { userId, fullName: "Ana Silva", avatarUrl: null, phone: "" },
      { profiles },
    );
    expect(updateByUserId).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ phone: null }),
    );
  });

  it.each([
    { userId, fullName: "A", avatarUrl: null, phone: null },
    { userId, fullName: "Valid Name", avatarUrl: "not-a-url", phone: null },
    {
      userId: "not-a-uuid",
      fullName: "Valid Name",
      avatarUrl: null,
      phone: null,
    },
    { userId, fullName: "Valid Name", avatarUrl: null, phone: "ab" }, // too short
  ])(
    "rejects invalid profile input: $fullName / phone=$phone",
    async (input) => {
      const profiles: ProfileRepositoryPort = {
        findByUserId: vi.fn(),
        updateByUserId: vi.fn(),
      };

      await expect(updateProfile(input, { profiles })).rejects.toThrow();
      expect(profiles.updateByUserId).not.toHaveBeenCalled();
    },
  );
});

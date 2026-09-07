import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionContextRefresh } from "./session-context-refresh";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("SessionContextRefresh", () => {
  afterEach(() => {
    refresh.mockReset();
    vi.useRealTimers();
  });

  it("refreshes on visibility, connectivity, and session boundaries", () => {
    vi.useFakeTimers();
    const boundary = new Date(Date.now() + 1000).toISOString();
    const { unmount } = render(
      <SessionContextRefresh boundaryTimes={[boundary]} />,
    );

    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("online"));
    vi.advanceTimersByTime(1000);

    expect(refresh).toHaveBeenCalledTimes(3);
    unmount();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(refresh).toHaveBeenCalledTimes(3);
  });
});

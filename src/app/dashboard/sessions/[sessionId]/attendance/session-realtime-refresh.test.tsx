import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionRealtimeRefresh } from "./session-realtime-refresh";

const refresh = vi.fn();
const resynchronizeSession = vi.fn().mockResolvedValue({
  changed: true,
  recovered: 1,
});
const close = vi.fn();
const subscribe = vi.fn();
const removeChannel = vi.fn();
let realtimeCallback: (() => void) | undefined;
const channel = {
  on: vi.fn((_type, _filter, callback: () => void) => {
    realtimeCallback = callback;
    return channel;
  }),
  subscribe,
};
subscribe.mockReturnValue(channel);
const client = {
  channel: vi.fn(() => channel),
  removeChannel,
};

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/infrastructure/supabase/browser-client", () => ({
  createSupabaseBrowserClient: () => client,
}));
vi.mock(
  "@/application/synchronization/use-cases/resynchronize-session",
  () => ({
    resynchronizeSession: (...args: unknown[]) => resynchronizeSession(...args),
  }),
);
vi.mock("@/infrastructure/composition/synchronization-composition", () => ({
  createSessionResynchronizationDeps: () => ({
    offlineStore: { close },
    transport: {},
  }),
}));

describe("SessionRealtimeRefresh", () => {
  it("subscribes to one session and refreshes on a minimal event", async () => {
    const { unmount } = render(
      <SessionRealtimeRefresh
        tenantId="c84d5db9-bc46-4f45-aa31-d16e77327c01"
        sessionId="f1541ed4-ee2c-45df-8618-72d96e682ad7"
      />,
    );

    expect(client.channel).toHaveBeenCalledWith(
      "session:f1541ed4-ee2c-45df-8618-72d96e682ad7",
    );
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        table: "session_realtime_events",
        filter: "session_id=eq.f1541ed4-ee2c-45df-8618-72d96e682ad7",
      }),
      expect.any(Function),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    refresh.mockClear();
    realtimeCallback?.();
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());

    unmount();
    await waitFor(() => expect(removeChannel).toHaveBeenCalledWith(channel));
  });
});

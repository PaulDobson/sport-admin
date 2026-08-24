import type { OfflineCommandTransportPort } from "@/application/synchronization/ports/offline-command-transport-port";
import type { OfflineCommand } from "@/domain/synchronization/offline-command";

export class FetchOfflineCommandTransport implements OfflineCommandTransportPort {
  async send(command: OfflineCommand) {
    const response = await fetch("/api/synchronization/commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(command),
    });
    const body = (await response.json().catch(() => ({}))) as {
      confirmed?: boolean;
      error?: string;
      conflict?: OfflineCommand["conflict"];
    };
    return {
      confirmed: response.ok && body.confirmed === true,
      error: body.error,
      conflict: response.status === 409 ? body.conflict : undefined,
    };
  }
}

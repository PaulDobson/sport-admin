import type { OfflineCommand } from "@/domain/synchronization/offline-command";

export interface OfflineCommandResult {
  confirmed: boolean;
  error?: string;
  conflict?: OfflineCommand["conflict"];
}

export interface OfflineCommandTransportPort {
  send(command: OfflineCommand): Promise<OfflineCommandResult>;
}

import type { ClassTemplateOption } from "./schedule-catalog-port";

export interface ClassTemplateAdministrationRow extends ClassTemplateOption {
  scheduleCount: number;
  sessionCount: number;
}

export interface ClassTemplateAdministrationPort {
  list(tenantId: string): Promise<ClassTemplateAdministrationRow[]>;
  update(input: {
    tenantId: string;
    id: string;
    name: string;
    capacity: number;
  }): Promise<void>;
  delete(input: { tenantId: string; id: string }): Promise<void>;
}

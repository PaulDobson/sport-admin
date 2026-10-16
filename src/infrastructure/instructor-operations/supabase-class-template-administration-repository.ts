import type { ClassTemplateAdministrationPort } from "@/application/instructor-operations/ports/class-template-administration-port";
import { ConflictError, DomainError } from "@/domain/shared/errors";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { Database } from "@/infrastructure/supabase/database.types";

type CatalogRow = Database["public"]["Functions"]["list_class_templates_for_administration"]["Returns"][number];
const batchSize = 500;

export class SupabaseClassTemplateAdministrationRepository implements ClassTemplateAdministrationPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async list(tenantId: string) {
    const rows: CatalogRow[] = [];
    for (let offset = 0; ; offset += batchSize) {
      const { data, error } = await this.client.rpc("list_class_templates_for_administration", {
        target_tenant_id: tenantId,
      }).range(offset, offset + batchSize - 1);
      if (error) throw error;
      if (!data) throw new Error("Missing class administration catalog");
      rows.push(...data);
      if (data.length < batchSize) break;
    }
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      capacity: row.capacity,
      disciplineName: row.discipline_name,
      scheduleCount: row.schedule_count,
      sessionCount: row.session_count,
    }));
  }

  async update(input: Parameters<ClassTemplateAdministrationPort["update"]>[0]) {
    const { data, error } = await this.client.from("class_templates")
      .update({ name: input.name, capacity: input.capacity })
      .eq("tenant_id", input.tenantId).eq("id", input.id).eq("status", "active")
      .select("id").maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new DomainError("NOT_FOUND", "La clase ya no está disponible o no tienes permiso para editarla. Actualiza el catálogo.");
    }
  }

  async delete(input: Parameters<ClassTemplateAdministrationPort["delete"]>[0]) {
    const { data, error } = await this.client.from("class_templates").delete()
      .eq("tenant_id", input.tenantId).eq("id", input.id).eq("status", "active")
      .select("id").maybeSingle();
    if (error?.code === "23503" || error?.code === "23001") {
      throw new ConflictError("No se puede eliminar esta clase porque tiene horarios o sesiones asociados, incluidos los históricos. La programación se ha conservado.");
    }
    if (error) throw error;
    if (!data) {
      throw new DomainError("NOT_FOUND", "La clase ya no está disponible o no tienes permiso para eliminarla. Actualiza el catálogo.");
    }
  }
}

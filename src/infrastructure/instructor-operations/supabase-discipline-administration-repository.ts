import type { DisciplineAdministrationPort, DisciplineListInput } from "@/application/instructor-operations/ports/discipline-administration-port";
import type { Discipline } from "@/domain/instructor-operations/schedule";
import { ConflictError, DomainError } from "@/domain/shared/errors";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { Database } from "@/infrastructure/supabase/database.types";

type Row = Database["public"]["Tables"]["disciplines"]["Row"];

function mapDiscipline(row: Row): Discipline {
  if (row.status !== "active" && row.status !== "archived") {
    throw new Error(`Unexpected discipline status: ${row.status}`);
  }
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

function throwDatabaseError(error: { code: string; message: string }): never {
  if (error.code === "23505") {
    throw new ConflictError("Ya existe una disciplina con ese nombre, incluso entre las archivadas.");
  }
  if (error.code === "23503") {
    throw new ConflictError("Esta disciplina tiene clases asociadas. Archívala para conservar la programación.");
  }
  throw error;
}

export class SupabaseDisciplineAdministrationRepository implements DisciplineAdministrationPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async list(input: DisciplineListInput) {
    const counts = await Promise.all(
      (["active", "archived"] as const).map(async (status) => {
        const { count, error } = await this.client
          .from("disciplines")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", input.tenantId)
          .eq("status", status);
        if (error) throwDatabaseError(error);
        if (count === null) throw new Error("Missing discipline count");
        return count;
      }),
    );
    const filteredQuery = () => {
      let query = this.client.from("disciplines")
        .select("id, tenant_id, name, status, created_at, class_templates(count)", { count: "exact" })
        .eq("tenant_id", input.tenantId);
      if (input.status !== "all") query = query.eq("status", input.status);
      if (input.search) {
        const literalSearch = input.search.replace(/[\\%_]/g, "\\$&");
        query = query.ilike("name", `%${literalSearch}%`);
      }
      return query.order("name").order("id");
    };
    let page = input.page;
    let result = await filteredQuery().range((page - 1) * input.pageSize, page * input.pageSize - 1);
    if (result.error) throwDatabaseError(result.error);
    if (result.count === null || !result.data) throw new Error("Missing discipline list");
    const lastPage = Math.max(1, Math.ceil(result.count / input.pageSize));
    if (page > lastPage) {
      page = lastPage;
      result = await filteredQuery().range((page - 1) * input.pageSize, page * input.pageSize - 1);
    }
    if (result.error) throwDatabaseError(result.error);
    if (result.count === null || !result.data) throw new Error("Missing discipline list");
    return {
      rows: result.data.map((row) => ({
        id: row.id,
        name: row.name,
        status: mapDiscipline(row).status,
        createdAt: row.created_at,
        templateCount: row.class_templates[0]?.count ?? 0,
      })),
      total: result.count,
      page,
      pageSize: input.pageSize,
      activeCount: counts[0],
      archivedCount: counts[1],
    };
  }

  async createDiscipline(input: { tenantId: string; name: string }) {
    const { data, error } = await this.client.from("disciplines")
      .insert({ tenant_id: input.tenantId, name: input.name })
      .select().single();
    if (error) throwDatabaseError(error);
    if (!data) throw new Error("Missing created discipline");
    return mapDiscipline(data);
  }

  async update(input: Parameters<DisciplineAdministrationPort["update"]>[0]) {
    const { data, error } = await this.client.from("disciplines")
      .update({ name: input.name, status: input.status })
      .eq("tenant_id", input.tenantId).eq("id", input.id)
      .select().maybeSingle();
    if (error) throwDatabaseError(error);
    if (!data) throw new DomainError("NOT_FOUND", "La disciplina ya no existe o no tienes permiso para editarla.");
    return mapDiscipline(data);
  }

  async delete(input: { tenantId: string; id: string }) {
    const { data, error } = await this.client.from("disciplines").delete()
      .eq("tenant_id", input.tenantId).eq("id", input.id)
      .select("id").maybeSingle();
    if (error) throwDatabaseError(error);
    if (!data) throw new DomainError("NOT_FOUND", "La disciplina ya no existe o no tienes permiso para eliminarla.");
  }
}

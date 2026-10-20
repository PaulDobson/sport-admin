import type { StudentAdministrationStatusFilter } from "@/application/instructor-operations/ports/student-repository-port";

export const studentLinkClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export interface StudentListParams {
  search?: string | string[];
  status?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
}

export interface StudentListQuery {
  search: string;
  status: StudentAdministrationStatusFilter;
  page: number;
  pageSize: number;
}

function positiveInteger(
  value: string | string[] | undefined,
  fallback: number,
  max: number,
) {
  if (typeof value !== "string") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, max)
    : fallback;
}

export function parseStudentListQuery(
  params: StudentListParams,
): StudentListQuery {
  return {
    search: typeof params.search === "string" ? params.search.trim() : "",
    status:
      params.status === "archived" || params.status === "all"
        ? params.status
        : "active",
    page: positiveInteger(params.page, 1, 10_000),
    pageSize: positiveInteger(params.pageSize, 10, 100),
  };
}

export function studentListParamsFromUrl(
  params: URLSearchParams,
): StudentListParams {
  const value = (key: string) => {
    const values = params.getAll(key);
    return values.length > 1 ? values : values[0];
  };
  return {
    search: value("search"),
    status: value("status"),
    page: value("page"),
    pageSize: value("pageSize"),
  };
}

export function studentQueryString(query: StudentListQuery) {
  // Build manually instead of URLSearchParams to avoid an object allocation
  // and toString() round-trip. All values are safe ASCII strings.
  const parts: string[] = [];
  if (query.search) parts.push(`search=${encodeURIComponent(query.search)}`);
  parts.push(`status=${query.status}`);
  parts.push(`page=${query.page}`);
  parts.push(`pageSize=${query.pageSize}`);
  return parts.join("&");
}

export function studentListHref(query: StudentListQuery) {
  return `/dashboard/students?${studentQueryString(query)}`;
}

export function studentTaskHref(path: string, query: StudentListQuery) {
  return `${path}?${studentQueryString(query)}`;
}

/**
 * Pre-compute the shared query string once and return a factory that appends
 * it to any path. Use this inside render loops where the query is the same for
 * every row, so the query string is serialized only once.
 *
 * @example
 * const taskHref = studentTaskHrefFactory(query);
 * rows.map(row => taskHref(`/dashboard/students/${row.id}`))
 */
export function studentTaskHrefFactory(query: StudentListQuery) {
  const qs = studentQueryString(query);
  return (path: string) => `${path}?${qs}`;
}

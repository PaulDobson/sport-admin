export type FinanceLinkParams = Record<string, string | undefined>;

/** Builds a finance URL from the current params plus overrides, dropping empty values. */
export function financeHref(
  params: FinanceLinkParams,
  overrides: FinanceLinkParams = {},
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...overrides })) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/dashboard/finance?${query}` : "/dashboard/finance";
}

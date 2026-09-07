import type {
  MembershipPlanStatus,
  StudentMembershipStatus,
} from "./membership";

export interface CollectionAccount {
  membershipId: string;
  studentId: string;
  studentName: string;
  planName: string;
  status: StudentMembershipStatus;
  expiresOn: string;
  nextBillingDate: string;
  expirationGraceDays: number;
  currency: string;
  contractedAmount: number;
  balance: number;
}

export interface CollectionItem extends CollectionAccount {
  dueOn: string;
  overdueDays: number;
  isOverdue: boolean;
}

export interface CollectionFilters {
  onDate: string;
  from?: string;
  to?: string;
  status?: StudentMembershipStatus;
}

export interface CollectionTotals {
  currency: string;
  pendingAmount: number;
  overdueAmount: number;
  accountCount: number;
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

/** Pending collections are derived from live memberships with a positive balance. */
export function deriveCollectionItems(
  accounts: CollectionAccount[],
  filters: CollectionFilters,
): CollectionItem[] {
  return accounts
    .filter((account) => account.balance > 0)
    .filter(
      (account) =>
        account.status !== "cancelled" && account.status !== "paused",
    )
    .filter((account) => !filters.status || account.status === filters.status)
    .map((account) => {
      const graceEnd = addDays(
        account.nextBillingDate,
        account.expirationGraceDays,
      );
      const overdueDays = Math.max(0, daysBetween(graceEnd, filters.onDate));
      return {
        ...account,
        dueOn: account.nextBillingDate,
        overdueDays,
        isOverdue: overdueDays > 0,
      };
    })
    .filter(
      (item) =>
        (!filters.from || item.dueOn >= filters.from) &&
        (!filters.to || item.dueOn <= filters.to),
    )
    .sort(
      (left, right) =>
        right.overdueDays - left.overdueDays ||
        left.dueOn.localeCompare(right.dueOn) ||
        left.studentName.localeCompare(right.studentName),
    );
}

export function summarizeCollections(
  items: CollectionItem[],
): CollectionTotals[] {
  const totals = new Map<string, CollectionTotals>();
  for (const item of items) {
    const current = totals.get(item.currency) ?? {
      currency: item.currency,
      pendingAmount: 0,
      overdueAmount: 0,
      accountCount: 0,
    };
    current.pendingAmount += item.balance;
    if (item.isOverdue) current.overdueAmount += item.balance;
    current.accountCount += 1;
    totals.set(item.currency, current);
  }
  return [...totals.values()].sort((left, right) =>
    left.currency.localeCompare(right.currency),
  );
}

export function isPlanCatalogEntryVisible(
  status: MembershipPlanStatus,
  showArchived: boolean,
) {
  return showArchived ? status === "archived" : status === "active";
}

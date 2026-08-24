import type { StudentMembershipStatus } from "./membership";

export type MembershipFollowUpKind = "renewal" | "past_due" | "expiration";

export interface MembershipFollowUpAccount {
  membershipId: string;
  studentId: string;
  studentName: string;
  status: StudentMembershipStatus;
  expiresOn: string;
  nextBillingDate: string;
  pastDueSince?: string;
  currency: string;
  balance: number;
}

export interface MembershipFollowUpItem extends MembershipFollowUpAccount {
  kind: MembershipFollowUpKind;
  followUpOn: string;
}

function toFollowUp(
  account: MembershipFollowUpAccount,
): MembershipFollowUpItem {
  if (account.status === "past_due") {
    return {
      ...account,
      kind: "past_due",
      followUpOn: account.pastDueSince ?? account.nextBillingDate,
    };
  }
  if (account.status === "expired") {
    return { ...account, kind: "expiration", followUpOn: account.expiresOn };
  }
  return { ...account, kind: "renewal", followUpOn: account.nextBillingDate };
}

export function filterMembershipFollowUps(
  accounts: MembershipFollowUpAccount[],
  filters: { from: string; to: string; status?: StudentMembershipStatus },
) {
  return accounts
    .filter(
      (account) =>
        account.status !== "paused" && account.status !== "cancelled",
    )
    .filter((account) => !filters.status || account.status === filters.status)
    .map(toFollowUp)
    .filter(
      (account) =>
        account.followUpOn >= filters.from && account.followUpOn <= filters.to,
    )
    .sort(
      (left, right) =>
        left.followUpOn.localeCompare(right.followUpOn) ||
        left.studentName.localeCompare(right.studentName),
    );
}

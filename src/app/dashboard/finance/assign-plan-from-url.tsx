"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AssignMembershipSheet } from "./assign-membership-sheet";

const ASSIGN_PARAM = "assign";

/** Opens the assignment sheet from any dashboard page through `?assign=1`. */
export function AssignPlanFromUrl() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const open = searchParams.get(ASSIGN_PARAM) === "1";

  return (
    <AssignMembershipSheet
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        const params = new URLSearchParams(searchParams.toString());
        params.delete(ASSIGN_PARAM);
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      }}
    />
  );
}

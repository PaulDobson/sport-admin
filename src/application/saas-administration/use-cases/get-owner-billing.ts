import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { OwnerBillingPort } from "../ports/owner-billing-port";
export async function getOwnerBilling(input: unknown,port: OwnerBillingPort) {
  const request = parseWithSchema(z.object({ tenantId: z.uuid(),page: z.number().int().min(1).max(1000000) }),input);
  return port.get(request.tenantId,request.page);
}

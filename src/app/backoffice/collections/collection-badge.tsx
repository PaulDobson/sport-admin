import type { SaasCollection } from "@/domain/saas-administration/collections";
import { StatusBadge } from "@/presentation/components/primitives";
import { collectionStatusLabels } from "./collection-links";

export function CollectionBadge({ invoice }: { invoice: SaasCollection }) {
  return <StatusBadge tone={invoice.status === "paid" ? "success" : invoice.status === "past_due" ? "destructive" : "neutral"}>{collectionStatusLabels[invoice.status]}</StatusBadge>;
}

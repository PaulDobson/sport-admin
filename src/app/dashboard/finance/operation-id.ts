import { createHash } from "node:crypto";

/** Same collection submitted twice maps to the same operation, so the RPC deduplicates it. */
export function collectionOperationId(parts: readonly string[]) {
  const digest = createHash("sha256").update(parts.join("|")).digest("hex");
  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    ((parseInt(digest.slice(16, 17), 16) & 0x3) | 0x8).toString(16) +
      digest.slice(17, 20),
    digest.slice(20, 32),
  ].join("-");
}

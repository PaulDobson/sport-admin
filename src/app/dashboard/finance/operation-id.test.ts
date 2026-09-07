import { describe, expect, it } from "vitest";
import { collectionOperationId } from "./operation-id";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("collection operation id", () => {
  it("produces a valid uuid", () => {
    expect(collectionOperationId(["tenant", "membership", "45000"])).toMatch(
      uuidPattern,
    );
  });

  it("repeats the same id for an identical submission so the payment is not duplicated", () => {
    const parts = ["tenant", "membership", "45000", "cash", "2026-09-05", ""];

    expect(collectionOperationId(parts)).toBe(collectionOperationId(parts));
  });

  it("changes when any part of the collection changes", () => {
    const base = ["tenant", "membership", "45000", "cash", "2026-09-05", ""];

    expect(collectionOperationId(base)).not.toBe(
      collectionOperationId([...base.slice(0, 2), "20000", ...base.slice(3)]),
    );
    expect(collectionOperationId(base)).not.toBe(
      collectionOperationId([
        ...base.slice(0, 3),
        "transfer",
        ...base.slice(4),
      ]),
    );
  });
});

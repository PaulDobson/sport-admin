import { describe, expect, it } from "vitest";
import { serializeCsv } from "./csv";

describe("serializeCsv", () => {
  it("escapes commas, quotes, and line breaks", () => {
    expect(
      serializeCsv([
        ["name", "note"],
        ['A, "B"', "line\nnext"],
      ]),
    ).toBe('name,note\r\n"A, ""B""","line\nnext"');
  });
});

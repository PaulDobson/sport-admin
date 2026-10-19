// @vitest-environment node
import { describe,expect,it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { createHash } from "node:crypto";
import { ReceiptPdfRenderer } from "./receipt-pdf";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { receiptFixture } from "@/domain/saas-administration/payment-receipt.fixture";
async function extract(bytes: Uint8Array) {
  const document = await getDocument({ data: Uint8Array.from(bytes),useSystemFonts: false }).promise;
  const texts: string[] = [];
  for (let i = 1; i <= document.numPages; i++) {
    const text = await (await document.getPage(i)).getTextContent();
    texts.push(text.items.map((item) => "str" in item ? item.str : "").join(" "));
  }
  await document.destroy();
  return texts;
}
describe("real receipt PDF",() => {
  it("renders a valid Unicode PDF and deterministic retry bytes",async () => {
    const renderer = new ReceiptPdfRenderer();
    const bytes = await renderer.render(receiptFixture);
    expect(Buffer.from(bytes.subarray(0,5)).toString()).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toContain("Comprobante referencial");
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    const text = (await extract(bytes)).join(" ");
    for (const expected of ["Academia Ñandú","María Pérez","Ñuble 123","Concepción","Capacitación y atención","TRANSFER-123","11.900","10.000","1.900"]) expect(text).toContain(expected);
    expect(text).toMatch(/sin validez tributaria/i);
    const retry = await renderer.render(receiptFixture);
    expect(createHash("sha256").update(retry).digest("hex")).toBe(createHash("sha256").update(bytes).digest("hex"));
  });
  it("paginates all long services and unbroken references",async () => {
    const bytes = await new ReceiptPdfRenderer().render({ ...receiptFixture,snapshot: {
      ...receiptFixture.snapshot,services: Array.from({ length: 50 },(_,i) => `${i + 1}. ${"Capacitación Ñandú ".repeat(20)}`),
      reference: "X".repeat(200),
    } });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(3);
    const pages = await extract(bytes);
    expect(pages.join(" ")).toContain("50.");
    expect(pages.every((page) => /sin validez tributaria/i.test(page))).toBe(true);
  });
});

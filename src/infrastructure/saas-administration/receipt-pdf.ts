import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { ReceiptCore } from "@/domain/saas-administration/payment-receipt";
import type { ReceiptRendererPort } from "@/application/saas-administration/ports/receipt-processing-port";

// A static font can be safely subset into an embedded TrueType font (SIL OFL 1.1).
const fontPath = join(process.cwd(),"node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff");
const money = (amount: number) => `CLP ${new Intl.NumberFormat("es-CL",{ maximumFractionDigits: 0 }).format(amount)}`;
export class ReceiptPdfRenderer implements ReceiptRendererPort {
  async render(receipt: ReceiptCore): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    pdf.setCreationDate(new Date(receipt.created_at));
    pdf.setModificationDate(new Date(receipt.created_at));
    pdf.setTitle(`Comprobante referencial ${receipt.folio}`);
    pdf.setAuthor(receipt.snapshot.issuer.legal_name);
    const font = await pdf.embedFont(Uint8Array.from(await readFile(fontPath)),{ subset: true });
    let page: PDFPage;
    let y: number;
    const width = 495;
    const addPage = () => {
      page = pdf.addPage([595.28,841.89]);
      y = 785;
      page.drawText("Comprobante referencial - sin validez tributaria",{ x: 50,y,font,size: 12,color: rgb(0.15,0.2,0.35) });
      y -= 26;
      page.drawText(`Folio ${receipt.folio} | Documento no autorizado por SII`,{ x: 50,y,font,size: 10 });
      y -= 30;
    };
    addPage();
    const line = (text: string,size = 11) => {
      for (const part of wrapText(text.replace(/[\u0000-\u001f\u007f]/g," "),font,size,width)) {
        if (y < 65) addPage();
        page.drawText(part,{ x: 50,y,font,size });
        y -= size + 7;
      }
    };
    const s = receipt.snapshot;
    line(s.issuer.legal_name,15);
    line(`RUT: ${s.issuer.tax_id}`);
    line(s.issuer.address);
    line(s.issuer.email);
    line(" ");
    line(`Receptor: ${s.tenant.name}`,13);
    if (s.tenant.tax_id) line(`RUT receptor: ${s.tenant.tax_id}`);
    if (s.tenant.address) line(s.tenant.address);
    if (s.tenant.billing_contact_name) line(`Contacto: ${s.tenant.billing_contact_name}`);
    if (s.tenant.billing_contact_email) line(`Correo de facturación: ${s.tenant.billing_contact_email}`);
    line(`Cobro: ${s.invoice_number}`);
    line(`Plan: ${s.plan_name}`);
    line(`Concepto: ${{ legacy: "Liquidación histórica",initial: "Contratación inicial",renewal: "Renovación",upgrade: "Diferencia proporcional por upgrade" }[s.concept]}`);
    line(`Servicio desde ${s.period_starts_on} hasta ${s.period_end_exclusive ?? "no registrado"} (fin exclusivo)`);
    for (const service of s.services) line(`- ${service}`);
    line(" ");
    line(`Fecha del pago: ${s.paid_on}`);
    line(`Método: ${{ transfer: "Transferencia",cash: "Efectivo",external_card: "Tarjeta externa",external_provider: "Proveedor externo" }[s.method]}`);
    if (s.reference) line(`Referencia: ${s.reference}`);
    line(`Neto: ${money(s.net)}`);
    line(`IVA informativo 19% incluido: ${money(s.vat)}`);
    line(`TOTAL PAGADO: ${money(s.total)}`,15);
    line("El IVA ya está incluido en el total. Este documento no reemplaza una boleta o factura tributaria.");
    const pages = pdf.getPages();
    pages.forEach((p,index) => p.drawText(`Página ${index + 1} de ${pages.length}`,{ x: 50,y: 35,font,size: 9 }));
    return pdf.save();
  }
}

export function wrapText(text: string,font: PDFFont,size: number,width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    if (font.widthOfTextAtSize(current ? `${current} ${word}` : word,size) <= width) {
      current = current ? `${current} ${word}` : word;
    } else {
      if (current) lines.push(current);
      current = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(current + char,size) > width) { lines.push(current); current = ""; }
        current += char;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [" "];
}

import { createRoot } from "react-dom/client";
import ReceiptPage from "../../src/app/backoffice/receipts/[receiptId]/page";
import DocumentProcessorPage from "../../src/app/backoffice/finance/documents/page";
import OwnerBillingPage from "../../src/app/billing/page";
import FinancialLedgerPage from "../../src/app/backoffice/finance/ledger/page";
import "../../src/presentation/styles/globals.css";
import "@fontsource-variable/manrope";
const search = Object.fromEntries(new URLSearchParams(location.search));
const page = location.pathname.startsWith("/billing") ? OwnerBillingPage({ searchParams: Promise.resolve(search) })
  : location.pathname.includes("/ledger") ? FinancialLedgerPage({ searchParams: Promise.resolve(search) })
  : location.pathname.includes("/documents") ? DocumentProcessorPage({ searchParams: Promise.resolve(search) })
    : ReceiptPage({ params: Promise.resolve({ receiptId: location.pathname.split("/")[3] }) });
void page.then((content) => createRoot(document.getElementById("root")!).render(content));

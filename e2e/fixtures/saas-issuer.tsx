import { createRoot } from "react-dom/client";
import BillingIssuerPage from "../../src/app/backoffice/finance/issuer/page";
import "../../src/presentation/styles/globals.css";
import "@fontsource-variable/manrope";

void BillingIssuerPage().then((page) => createRoot(document.getElementById("root")!).render(page));

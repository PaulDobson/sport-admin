import { createRoot } from "react-dom/client";
import RenewalProcessorPage from "../../src/app/backoffice/finance/renewals/page";
import "../../src/presentation/styles/globals.css";
import "@fontsource-variable/manrope";

void RenewalProcessorPage().then((page) => createRoot(document.getElementById("root")!).render(page));

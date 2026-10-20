import { createRoot } from "react-dom/client";
import CollectionsPage from "../../src/app/backoffice/collections/page";
import CollectionDetailPage from "../../src/app/backoffice/collections/[invoiceId]/page";
import "../../src/presentation/styles/globals.css";
import "@fontsource-variable/manrope";

const search = Object.fromEntries(new URLSearchParams(location.search));
const invoiceId = location.pathname.split("/")[3];
const page = invoiceId
  ? CollectionDetailPage({ params: Promise.resolve({ invoiceId }), searchParams: Promise.resolve(search) })
  : CollectionsPage({ searchParams: Promise.resolve(search) });
void page.then((content) => createRoot(document.getElementById("root")!).render(content));

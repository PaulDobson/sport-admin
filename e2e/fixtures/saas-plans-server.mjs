import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(vitestRequire.resolve("vite"));
const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const backend = path.join(root, "e2e/fixtures/saas-plans-backend.ts");

export async function startSaasPlansFixture() {
  const server = await createServer({
    root,
    configFile: false,
    plugins: [{
      name: "saas-plans-test-backend",
      enforce: "pre",
      resolveId(source, importer) {
        source = source.replace(`${root}/src/`, "@/");
        if (source === "next/link") return path.join(root, "e2e/fixtures/student-link.tsx");
        if (source === "@/infrastructure/composition/saas-renewal-composition") return backend;
        if (["@/infrastructure/composition/saas-documents-composition","@/infrastructure/composition/auth-composition","@/infrastructure/composition/owner-billing-composition"].includes(source)) return backend;
        if (source === "node:crypto" || source === "next/navigation" || source === "@/app/dashboard/profile/sign-out-action"
          || ((importer?.includes("/src/app/backoffice/plans/") || importer?.includes("/subscription/") || importer?.includes("/finance/renewals/")
            || importer?.includes("/backoffice/collections/") || importer?.includes("/finance/issuer/") || importer?.includes("/backoffice/receipts/")
            || importer?.includes("/finance/documents/") || importer?.includes("/finance/ledger/"))
            && (/(?:^|\/)(?:actions|payment-actions|renewal-action)(?:\.ts)?$/.test(source) || source.includes("_lib/backoffice-context")))) return backend;
      },
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if (request.url?.startsWith("/backoffice/plans")) request.url = "/e2e/fixtures/saas-plans.html";
          if (request.url?.startsWith("/backoffice/tenants/")) request.url = "/e2e/fixtures/saas-assignment.html";
          if (request.url?.startsWith("/backoffice/finance/renewals")) request.url = "/e2e/fixtures/saas-renewals.html";
          if (request.url?.startsWith("/backoffice/collections")) request.url = "/e2e/fixtures/saas-collections.html";
          if (request.url?.startsWith("/backoffice/finance/issuer")) request.url = "/e2e/fixtures/saas-issuer.html";
          if (request.url?.startsWith("/backoffice/receipts") || request.url?.startsWith("/backoffice/finance/documents") || request.url?.startsWith("/backoffice/finance/ledger") || request.url?.startsWith("/billing")) request.url = "/e2e/fixtures/saas-documents.html";
          next();
        });
      },
    }, react()],
    resolve: { alias: { "@": path.join(root, "src") } },
    server: { host: "127.0.0.1", port: 4179, strictPort: true },
    logLevel: "error",
  });
  await server.listen();
  return { close: () => server.close() };
}

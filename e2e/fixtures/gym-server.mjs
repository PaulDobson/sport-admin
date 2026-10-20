import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(vitestRequire.resolve("vite"));
const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const backend = path.join(root, "e2e/fixtures/gym-backend.ts");

export async function startGymFixture() {
  const server = await createServer({
    root,
    configFile: false,
    plugins: [{
      name: "gym-test-backend",
      enforce: "pre",
      resolveId(source, importer) {
        source = source.replace(`${root}/src/`, "@/");
        if (source === "next/link") return path.join(root, "e2e/fixtures/student-link.tsx");
        if (source === "next/navigation" || source === "@/app/_lib/operational-context" ||
          source === "@/infrastructure/composition/tenant-details-composition" ||
          source === "@/app/select-tenant/actions" || source === "@/app/dashboard/profile/sign-out-action" ||
          (importer?.includes("/src/app/dashboard/gym/") && /(?:^|\/)actions(?:\.ts)?$/.test(source))) return backend;
      },
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if (request.url?.startsWith("/dashboard/gym")) request.url = "/e2e/fixtures/gym.html";
          next();
        });
      },
    }, react()],
    resolve: { alias: { "@": path.join(root, "src") } },
    server: { host: "127.0.0.1", port: 4178, strictPort: true },
    logLevel: "error",
  });
  await server.listen();
  return { close: () => server.close() };
}

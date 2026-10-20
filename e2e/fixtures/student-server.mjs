import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import react from "@vitejs/plugin-react";

// Use the Vite installation already owned by Vitest, without adding test tooling.
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(vitestRequire.resolve("vite"));
const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const backend = path.join(root, "e2e/fixtures/student-backend.ts");

export async function startStudentFixture() {
  const server = await createServer({
    root,
    configFile: false,
    plugins: [
      {
        name: "student-test-backend",
        enforce: "pre",
        resolveId(source, importer) {
          source = source.replace(`${root}/src/`, "@/");
          if (source === "next/link") return path.join(root, "e2e/fixtures/student-link.tsx");
          if (source === "next/navigation" ||
              source === "@/app/_lib/operational-context" ||
              source.startsWith("@/infrastructure/composition/") ||
              /@\/application\/(?:evolution-health-attendance|instructor-finance)\/use-cases\//.test(source) ||
              (importer?.includes("/src/app/dashboard/students/") && /(?:^|\/)(?:actions|portal-invitation-actions)(?:\.ts)?$/.test(source))) return backend;
        },
        configureServer(server) {
          server.middlewares.use((request, _response, next) => {
            if (request.url?.startsWith("/dashboard/students")) request.url = "/e2e/fixtures/student.html";
            next();
          });
        },
      },
      react(),
    ],
    resolve: { alias: { "@": path.join(root, "src") } },
    server: { host: "127.0.0.1", port: 4175, strictPort: true },
    logLevel: "error",
  });
  await server.listen();
  return { close: () => server.close() };
}

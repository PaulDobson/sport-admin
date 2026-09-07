import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("service worker offline session strategy", () => {
  it("versions the shell and replaces the explicitly preloaded current session", async () => {
    const source = await readFile("public/sw.js", "utf8");

    expect(source).toContain("const SW_VERSION = 'v3'");
    expect(source).toContain("PRECACHE_CURRENT_SESSION");
    expect(source).toContain("caches.delete(CURRENT_SESSION_CACHE_NAME)");
    expect(source).toContain("CURRENT_SESSION_PATH.test(url.pathname)");
    expect(source).toContain(
      "STATIC_DESTINATIONS.has(event.request.destination)",
    );
    expect(source).toContain("await fetch(event.request)");
    expect(source).toContain("cache.put(event.request, response.clone())");
    expect(source).toContain("return caches.match('/')");
    expect(source).not.toContain(
      "if (cached) return cached;\n\n        const response = await fetch(event.request)",
    );
  });
});

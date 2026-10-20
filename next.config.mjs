/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true, // Avoid generating AGENTS.md/CLAUDE.md; the repo already has its own agent/skill config under .agents and .claude.
  agentRules: false,
  outputFileTracingIncludes: {
    "/api/saas/documents/process": ["./node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff"],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

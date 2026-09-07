/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true, // Avoid generating AGENTS.md/CLAUDE.md; the repo already has its own agent/skill config under .agents and .claude.
  agentRules: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

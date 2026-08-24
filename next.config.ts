import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // Avoid generating AGENTS.md/CLAUDE.md; the repo already has its own agent/skill config under .agents and .claude.
  agentRules: false,
};

export default nextConfig;

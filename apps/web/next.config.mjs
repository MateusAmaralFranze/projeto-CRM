import nextEnv from "@next/env";
import path from "node:path";

const { loadEnvConfig } = nextEnv;

// Next.js só carrega .env da própria pasta (apps/web) por padrão.
// Aqui apontamos explicitamente pro .env da raiz do monorepo.
loadEnvConfig(path.resolve(process.cwd(), "../.."));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@adtrack/database"],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;

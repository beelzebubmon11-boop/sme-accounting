import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": ["./electron/migrations/**"],
  },
};

export default nextConfig;

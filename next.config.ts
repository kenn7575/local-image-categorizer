import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["onnxruntime-node", "sharp"],
};

export default nextConfig;

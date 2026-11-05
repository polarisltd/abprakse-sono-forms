import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server's HMR/webpack endpoint be reached from other devices
  // on the local network (e.g. a tablet testing the doctor UI), not just
  // localhost. Dev-only; irrelevant to a production build.
  allowedDevOrigins: ['192.168.68.143'],
};

export default nextConfig;

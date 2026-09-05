import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Listing photos come from many portals; allow any https host.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // imapflow / mailparser are Node-only; keep them out of the client bundle.
  serverExternalPackages: ["imapflow", "mailparser"],
};

export default nextConfig;

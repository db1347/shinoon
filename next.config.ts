import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Service worker is served at the origin root so it can control the
        // whole site. `Service-Worker-Allowed: /` is redundant for a SW at
        // `/sw.js` but explicit headers make the intent obvious.
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          // Update quickly during development; production gets fresh SWs on
          // each deploy thanks to Next's cache busting upstream.
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;

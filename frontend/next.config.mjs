/** The Python API (api.py) runs separately; the browser only talks to /api/*,
 *  and Next forwards those calls to it. Set API_URL on the host (e.g. Render). */
const API_URL = process.env.API_URL || "http://127.0.0.1:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: false, // gzip can buffer server-sent events
  reactStrictMode: true,
  // A debate streams for several minutes; the default proxy timeout (30s) would cut it.
  experimental: { proxyTimeout: 600000 },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;

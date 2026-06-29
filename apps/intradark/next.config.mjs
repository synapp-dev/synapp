/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/sandbox", destination: "/admin/sandbox", permanent: false },
      {
        source: "/sandbox/:path*",
        destination: "/admin/sandbox/:path*",
        permanent: false,
      },
    ];
  },
  transpilePackages: ["@workspace/ui", "country-flag-icons"],
  // SSH stack for the plugin push-to-live (ssh2 has an OPTIONAL native dep
  // `cpu-features`); keep these out of the bundle so they're required at runtime
  // where ssh2 gracefully skips cpu-features.
  // ssh2 stack (above) plus the CS2 demo parser, a native N-API addon that must
  // be required at runtime rather than bundled (DevTools → Demos parser).
  serverExternalPackages: [
    "ssh2-sftp-client",
    "ssh2",
    "cpu-features",
    "@laihoe/demoparser2",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "allstar.gg",
      },
      {
        protocol: "https",
        hostname: "mediacdn.allstar.gg",
      },
      {
        protocol: "https",
        hostname: "faceit-a.akamaihd.net",
      },
      {
        protocol: "https",
        hostname: "avatars.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "community.akamai.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "cdn.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "ujunmzeennmbbolmskdd.supabase.co",
      },
    ],
  },
};

export default nextConfig;

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

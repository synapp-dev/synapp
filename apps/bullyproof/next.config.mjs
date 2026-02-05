/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.imgur.com",
      },
      {
        protocol: "https",
        hostname: "sukurbtgprvxgoeagich.supabase.co",
      },
      {
        protocol: "https",
        hostname: "api.bullyproofaustralia.org.au",
      },
      {
        protocol: "https",
        hostname: "db.bullyproofaustralia.org.au",
      },
    ],
  },
};

export default nextConfig;

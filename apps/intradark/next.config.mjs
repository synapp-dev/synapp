/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
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
    ],
  },
};

export default nextConfig;

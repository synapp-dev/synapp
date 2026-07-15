/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/supabase", "@workspace/env-check"],
  // Keep server SDKs out of the bundle — bundling duplicates their classes
  // (breaks @anthropic-ai/sdk's tool runner) and googleapis is huge.
  serverExternalPackages: ["@anthropic-ai/sdk", "googleapis", "web-push"],
  images: {
    remotePatterns: [
      // Exercise demonstration images in Supabase storage.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
}

export default nextConfig

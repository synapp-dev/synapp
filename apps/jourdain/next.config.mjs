/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  // Keep server SDKs out of the bundle — bundling duplicates their classes
  // (breaks @anthropic-ai/sdk's tool runner) and googleapis is huge.
  serverExternalPackages: ["@anthropic-ai/sdk", "googleapis", "web-push"],
}

export default nextConfig

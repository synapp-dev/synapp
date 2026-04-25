/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  async redirects() {
    return [
      {
        source: "/:organisation/:venue/menu",
        destination: "/:organisation/:venue/catalog/items",
        permanent: true,
      },
      {
        source: "/:organisation/:venue/menu/recipes",
        destination: "/:organisation/:venue/catalog/items",
        permanent: true,
      },
      {
        source: "/:organisation/:venue/menu/menu-items",
        destination: "/:organisation/:venue/catalog/menu",
        permanent: true,
      },
      {
        source: "/:organisation/:venue/menu/ingredients",
        destination: "/:organisation/:venue/catalog/ingredients",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/:organisation/:venue/catalog/items",
        destination: "/:organisation/:venue/menu/recipes",
      },
      {
        source: "/:organisation/:venue/catalog/menu",
        destination: "/:organisation/:venue/menu/menu-items",
      },
      {
        source: "/:organisation/:venue/catalog/ingredients",
        destination: "/:organisation/:venue/menu/ingredients",
      },
    ];
  },
};

export default nextConfig;

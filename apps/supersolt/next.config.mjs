/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  async redirects() {
    return [
      {
        source: "/:organisation/:venue/menu",
        destination: "/:organisation/:venue/settings/inventory-setup/recipes",
        permanent: true,
      },
      {
        source: "/:organisation/:venue/menu/recipes",
        destination: "/:organisation/:venue/settings/inventory-setup/recipes",
        permanent: true,
      },
      {
        source: "/:organisation/:venue/menu/ingredients",
        destination:
          "/:organisation/:venue/settings/inventory-setup/master-inventory-list",
        permanent: true,
      },
      {
        source: "/:organisation/:venue/catalog/items",
        destination: "/:organisation/:venue/settings/inventory-setup/recipes",
        permanent: true,
      },
      {
        source: "/:organisation/:venue/catalog/ingredients",
        destination:
          "/:organisation/:venue/settings/inventory-setup/master-inventory-list",
        permanent: true,
      },
      {
        source: "/:organisation/:venue/settings/inventory",
        destination:
          "/:organisation/:venue/settings/inventory-setup/master-inventory-list",
        permanent: false,
      },
      {
        source: "/:organisation/:venue/settings/recipes",
        destination: "/:organisation/:venue/settings/inventory-setup/recipes",
        permanent: false,
      },
      {
        source: "/:organisation/:venue/admin-tools",
        destination: "/:organisation/:venue/settings/devkit",
        permanent: false,
      },
      {
        source: "/:organisation/:venue/settings/venues",
        destination: "/:organisation/:venue/settings/venue",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/:organisation/:venue/catalog/menu",
        destination: "/:organisation/:venue/menu/menu-items",
      },
    ];
  },
};

export default nextConfig;

/**
 * Utility functions for handling map names and images
 */

export const getMapImageName = (mapName: string | undefined | null): string => {
  // Handle undefined or null map names
  if (!mapName) {
    return "dust2-badge.png"; // Use dust2 as fallback since it's a common map
  }

  // Convert map name to the format used in the images folder
  // Remove any prefixes and add -badge suffix
  const baseName = mapName
    .toLowerCase()
    .replace(/^de_/, "")
    .replace(/^cs_/, "")
    .replace(/^ar_/, "");

  // Handle special cases for maps that might have different naming
  const mapNameMap: Record<string, string> = {
    dust2: "dust2",
    mirage: "mirage",
    inferno: "inferno",
    overpass: "overpass",
    nuke: "nuke",
    ancient: "ancient",
    anubis: "anubis",
    vertigo: "vertigo",
    train: "train",
    grail: "grail",
    jura: "jura",
    dogtown: "dogtown",
    brewery: "brewery",
    office: "office",
    italy: "italy",
    agency: "agency",
    shoots: "shoots",
    pool_day: "pool_day",
    baggage: "baggage",
  };

  const normalizedName = mapNameMap[baseName] || baseName;
  return `${normalizedName}-badge.png`;
};

export const getMapDisplayName = (
  mapName: string | undefined | null
): string => {
  // Handle undefined or null map names
  if (!mapName) {
    return "UNK";
  }

  // Remove prefix and get the base map name
  const baseName = mapName
    .replace(/^de_/, "")
    .replace(/^cs_/, "")
    .replace(/^ar_/, "");

  // Special case for dust2
  if (baseName === "dust2") {
    return "D2";
  }

  // For all other maps, take first 3 letters and uppercase
  return baseName.substring(0, 3).toUpperCase();
};

/**
 * Get the full map name for display (e.g., "Mirage", "Dust2")
 */
export const getMapFullName = (mapName: string | undefined | null): string => {
  // Handle undefined or null map names
  if (!mapName) {
    return "Unknown";
  }

  // Remove prefix and get the base map name
  const baseName = mapName
    .replace(/^de_/, "")
    .replace(/^cs_/, "")
    .replace(/^ar_/, "");

  // Capitalize first letter
  return baseName.charAt(0).toUpperCase() + baseName.slice(1);
};

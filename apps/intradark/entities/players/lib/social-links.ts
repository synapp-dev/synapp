export interface PlayerSocialLinks {
  twitchUrl: string | null;
  xUrl: string | null;
  instagramUrl: string | null;
}

export const EMPTY_PLAYER_SOCIAL_LINKS: PlayerSocialLinks = {
  twitchUrl: null,
  xUrl: null,
  instagramUrl: null,
};

export function playerSocialLinksFromRow(row: {
  twitch_url?: string | null;
  x_url?: string | null;
  instagram_url?: string | null;
}): PlayerSocialLinks {
  return {
    twitchUrl: row.twitch_url?.trim() || null,
    xUrl: row.x_url?.trim() || null,
    instagramUrl: row.instagram_url?.trim() || null,
  };
}

export type ProfileSocialIcon = "twitch" | "x" | "instagram";

export interface ProfileSocialLinkItem {
  label: string;
  href: string;
  icon: ProfileSocialIcon;
}

/** Member-set links only; Steam is handled separately from steamid64. */
export function listProfileSocialLinks(
  links: PlayerSocialLinks,
): ProfileSocialLinkItem[] {
  const items: ProfileSocialLinkItem[] = [];

  if (links.twitchUrl) {
    items.push({ label: "Twitch", href: links.twitchUrl, icon: "twitch" });
  }
  if (links.xUrl) {
    items.push({ label: "X", href: links.xUrl, icon: "x" });
  }
  if (links.instagramUrl) {
    items.push({
      label: "Instagram",
      href: links.instagramUrl,
      icon: "instagram",
    });
  }

  return items;
}

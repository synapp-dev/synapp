export const PLAYER_PROFILE_MAX_COMMENT_DEPTH = 3;
export const PLAYER_PROFILE_MAX_BODY_LENGTH = 1000;
export const PLAYER_PROFILE_TOP_LEVEL_PAGE_SIZE = 20;
export const PLAYER_PROFILE_COMMENTS_PER_PROFILE_24H = 10;
export const PLAYER_PROFILE_TRUST_VOTE_CHANGES_24H = 1;
export const PROFILE_COMMENTS_SECTION_ID = "profile-comments";

export const TRUST_SIGNALS = ["legit", "suspicious"] as const;
export type ProfileTrustSignal = (typeof TRUST_SIGNALS)[number];

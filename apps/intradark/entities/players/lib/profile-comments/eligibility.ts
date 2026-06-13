export type ProfileCommentEligibility = {
  isSignedIn: boolean;
  canWrite: boolean;
  canVote: boolean;
  blockReason: "sign_in" | "link_steam" | null;
};

export function resolveProfileCommentEligibility(input: {
  isSignedIn: boolean;
  steamProfileId: string | null | undefined;
  isProfileOwner: boolean;
}): ProfileCommentEligibility {
  if (!input.isSignedIn) {
    return {
      isSignedIn: false,
      canWrite: false,
      canVote: false,
      blockReason: "sign_in",
    };
  }

  if (!input.steamProfileId) {
    return {
      isSignedIn: true,
      canWrite: false,
      canVote: false,
      blockReason: "link_steam",
    };
  }

  return {
    isSignedIn: true,
    canWrite: true,
    canVote: !input.isProfileOwner,
    blockReason: null,
  };
}

export function assertTrustVoteAllowed(input: {
  voterSteamProfileId: string;
  subjectSteamid64: string;
}): boolean {
  return input.voterSteamProfileId !== input.subjectSteamid64;
}

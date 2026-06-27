"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { anthemProvider } from "@/entities/players/lib/anthem";
import {
  EMPTY_PLAYER_SOCIAL_LINKS,
  type PlayerSocialLinks,
} from "@/entities/players/lib/social-links";
import { useAnthemPlayer } from "@/entities/players/components/anthem-player-provider";
import { useGcBadges } from "@/entities/players/hooks/use-gc-badges";
import {
  useGetSteamProfile,
  useGetLeetifyProfile,
} from "@/entities/players/hooks/queries";
import { PlayerHeader } from "@/entities/players/components/player-header";
import { LeetifyRatingsCard } from "@/entities/players/components/leetify-ratings-card";
import { FaceitRatingsCard } from "@/entities/players/components/faceit-ratings-card";
import { SteamCard } from "@/entities/players/components/steam-card";
import { PlayerProfileMatchesPanel } from "@/components/organisms/player-profile/player-profile-matches-panel";
import { PlayerProfileMediaPanel } from "@/components/organisms/player-profile/player-profile-media-panel";
import { ProfileCommentsCard } from "@/entities/players/components/profile-comments-card";
import {
  PlayerProfileTabs,
  type PlayerProfileTab,
} from "@/entities/players/components/player-profile-tabs";
import type { ProfileCommentEligibility } from "@/entities/players/lib/profile-comments/eligibility";
import type {
  ProfileCommentsPage,
  ProfileTrustCounts,
} from "@/entities/players/lib/profile-comments/queries";
import type { TeamSummary } from "@/entities/teams/types";

/** If playback never starts and no gesture arrives, don't block forever. */
const PLAYBACK_FALLBACK_MS = 12_000;
/** Stagger between profile rating cards (Leetify → FACEIT → Steam). */
const CARD_STAGGER_S = 0.4;
/** Fade-up duration per card; pairs with {@link CARD_EASING}. */
const CARD_ANIM_MS = 4000;
/** Fast out, soft settle — same decel curve as the header wall emerge. */
const CARD_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const PROFILE_RATING_CARD_COUNT = 3;
/** Gap after header before the card grid starts. */
const SECTION_FADE_MS = 300;

export interface PlayerProfileProps {
  steamid64: string;
  linkedUsername?: string | null;
  /** "First Last" from user_profiles; shown under the alias when present. */
  fullName?: string | null;
  /** ISO 3166-1 alpha-2 country code for the subtitle flag. */
  countryFlag?: string | null;
  displayName?: string | null;
  /** Canonical anthem URL (Spotify or SoundCloud) for this profile; null when unset. */
  anthemUrl?: string | null;
  /** Member-set social links from user_profiles. */
  socialLinks?: PlayerSocialLinks;
  /** Whether the current viewer owns this profile (gates the anthem editor). */
  isOwner?: boolean;
  /** Most recently joined team; drives header watermark and team badge. */
  team?: TeamSummary | null;
  trustCounts?: ProfileTrustCounts;
  commentsPage?: ProfileCommentsPage;
  commentEligibility?: ProfileCommentEligibility;
  viewerUserId?: string | null;
}

/**
 * Aggregated CS2 player profile: Steam header plus per-source panels that each
 * fetch DB-first archived data and live-update where supported.
 */
export function PlayerProfile({
  steamid64,
  linkedUsername,
  fullName,
  countryFlag = null,
  displayName,
  anthemUrl = null,
  socialLinks = EMPTY_PLAYER_SOCIAL_LINKS,
  isOwner = false,
  team = null,
  trustCounts = { legit: 0, suspicious: 0 },
  commentsPage,
  commentEligibility,
  viewerUserId = null,
}: PlayerProfileProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const queryClient = useQueryClient();
  const { data } = useGetSteamProfile(steamid64);
  const { data: leetify } = useGetLeetifyProfile(steamid64);
  const steam = data?.success ? data.data : null;
  const steamName = steam?.personaname || null;
  const isMember = !!linkedUsername;
  const { badges, initialLoadDone } = useGcBadges(steamid64);

  useEffect(() => {
    if (!badges) return;
    void queryClient.invalidateQueries({
      queryKey: ["players", steamid64, "legitimacy"],
    });
  }, [badges, queryClient, steamid64]);

  // Alias precedence: intradark name first, Steam persona as fallback.
  const name = linkedUsername || displayName || steamName || steamid64;
  const premierRating = leetify?.premierRating ?? leetify?.premier ?? null;
  const csgoPro = leetify?.csgoPro ?? false;
  const cs2Pro = leetify?.cs2Pro ?? false;

  const anthemKind = anthemProvider(anthemUrl);
  const expectsSoundcloud = anthemKind === "soundcloud";

  const { hasStartedPlaying, gestureRevealUnlocked, setAnthem } =
    useAnthemPlayer();

  // Register SoundCloud early so playback can start before the header / anthem
  // card are visible on screen.
  useEffect(() => {
    if (!expectsSoundcloud || !anthemUrl) return;
    setAnthem(anthemUrl);
    return () => setAnthem(null);
  }, [anthemUrl, expectsSoundcloud, setAnthem]);

  const [startHeaderReveal, setStartHeaderReveal] =
    useState(!expectsSoundcloud);
  const [headerComplete, setHeaderComplete] = useState(false);
  const [showBottomSections, setShowBottomSections] = useState(false);
  const [activeTab, setActiveTab] = useState<PlayerProfileTab>("overview");

  // SoundCloud: reveal when the song actually starts. If autoplay is blocked,
  // reveal on the first page gesture instead (see AnthemPlayerProvider).
  useEffect(() => {
    if (!expectsSoundcloud) {
      setStartHeaderReveal(true);
      return;
    }

    if (hasStartedPlaying || gestureRevealUnlocked) {
      setStartHeaderReveal(true);
      return;
    }

    setStartHeaderReveal(false);
    const fallbackTimer = setTimeout(
      () => setStartHeaderReveal(true),
      PLAYBACK_FALLBACK_MS,
    );
    return () => clearTimeout(fallbackTimer);
  }, [expectsSoundcloud, hasStartedPlaying, gestureRevealUnlocked]);

  const handleHeaderRevealComplete = useCallback(() => {
    setHeaderComplete(true);
  }, []);

  // After the header finishes and badges have loaded, stagger the panels below.
  useEffect(() => {
    if (!headerComplete || !initialLoadDone) return;
    if (prefersReducedMotion) {
      setShowBottomSections(true);
      return;
    }
    const t = setTimeout(() => setShowBottomSections(true), SECTION_FADE_MS);
    return () => clearTimeout(t);
  }, [headerComplete, initialLoadDone, prefersReducedMotion]);

  return (
    <div className="space-y-2">
      <PlayerHeader
        name={name}
        subtitle={fullName ?? null}
        countryFlag={countryFlag}
        avatarSrc={steam?.avatarfull || null}
        steamid64={steamid64}
        isMember={isMember}
        premierRating={premierRating}
        csgoPro={csgoPro}
        cs2Pro={cs2Pro}
        anthemUrl={anthemUrl}
        socialLinks={socialLinks}
        isOwner={isOwner}
        team={team}
        start={startHeaderReveal}
        onRevealComplete={handleHeaderRevealComplete}
      />

      {showBottomSections ? (
        <PlayerProfileTabs
          value={activeTab}
          onValueChange={setActiveTab}
          trustCounts={trustCounts}
          className="pt-2"
          overview={
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <StaggeredAnimation
                  index={0}
                  chainFromZero
                  baseDelay={0}
                  incrementDelay={CARD_STAGGER_S}
                  fadeDirection="up"
                  durationMs={CARD_ANIM_MS}
                  easing={CARD_EASING}
                  reducedMotion={prefersReducedMotion}
                  className="h-full"
                >
                  <LeetifyRatingsCard steamid64={steamid64} />
                </StaggeredAnimation>
                <StaggeredAnimation
                  index={1}
                  chainFromZero
                  baseDelay={0}
                  incrementDelay={CARD_STAGGER_S}
                  fadeDirection="up"
                  durationMs={CARD_ANIM_MS}
                  easing={CARD_EASING}
                  reducedMotion={prefersReducedMotion}
                  className="h-full"
                >
                  <FaceitRatingsCard steamid64={steamid64} />
                </StaggeredAnimation>
                <StaggeredAnimation
                  index={2}
                  chainFromZero
                  baseDelay={0}
                  incrementDelay={CARD_STAGGER_S}
                  fadeDirection="up"
                  durationMs={CARD_ANIM_MS}
                  easing={CARD_EASING}
                  reducedMotion={prefersReducedMotion}
                  className="h-full"
                >
                  <SteamCard steamid64={steamid64} badges={badges} />
                </StaggeredAnimation>
              </div>

              <StaggeredAnimation
                index={PROFILE_RATING_CARD_COUNT}
                chainFromZero
                baseDelay={0}
                incrementDelay={CARD_STAGGER_S}
                fadeDirection="up"
                durationMs={CARD_ANIM_MS}
                easing={CARD_EASING}
                reducedMotion={prefersReducedMotion}
              >
                {commentsPage && commentEligibility ? (
                  <ProfileCommentsCard
                    steamid64={steamid64}
                    linkedUsername={linkedUsername}
                    initialPage={commentsPage}
                    eligibility={commentEligibility}
                    viewerUserId={viewerUserId}
                  />
                ) : null}
              </StaggeredAnimation>
            </div>
          }
          matches={
            <PlayerProfileMatchesPanel playerId={steamid64} className="pt-2" />
          }
          media={
            <PlayerProfileMediaPanel playerId={steamid64} className="pt-2" />
          }
        />
      ) : null}
    </div>
  );
}

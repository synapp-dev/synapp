import { notFound, redirect } from "next/navigation";

import { getProfileCommentEligibilityForViewer } from "@/entities/players/actions/profile-comments-actions";
import { resolvePlayerIdentifier } from "@/entities/players/lib/server/resolve-server";
import { collectTreeCommentIds } from "@/entities/players/lib/profile-comments/build-comment-tree";
import {
  getPlayerProfileTrustCounts,
  listCommentsForSubject,
} from "@/entities/players/lib/profile-comments/queries";
import {
  getReactionsForTarget,
  getReactionsForTargets,
} from "@/entities/reactions/lib/queries";
import { viewerAuthorFromProfiles } from "@/entities/reactions/lib/viewer";
import { getPlayerTeamForProfile } from "@/entities/teams/lib/queries";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";
import { PlayerProfile } from "@/entities/players/components/player-profile";

export const dynamic = "force-dynamic";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Next can hand the segment back URL-encoded (e.g. "%40jourdain"); decode so
  // the canonical comparison is encoding-insensitive and can't loop.
  const decodedId = decodeURIComponent(id);

  const resolved = await resolvePlayerIdentifier(decodedId);
  if (!resolved) notFound();

  // Redirect to the canonical URL (@username for members, steamid64 otherwise),
  // comparing decoded paths so encoding differences never trigger a redirect.
  const currentPath = `/players/${decodedId}`;
  const canonicalPath = decodeURIComponent(resolved.canonical);
  if (currentPath !== canonicalPath) {
    redirect(resolved.canonical);
  }

  // Owner gate for the inline anthem editor. Purely controls whether the edit
  // affordance shows; the write itself is enforced by RLS (auth.uid() = user_id).
  const viewer = await getCurrentUserProfiles();
  const isOwner =
    viewer?.userProfile.steam_profile_id != null &&
    viewer.userProfile.steam_profile_id === resolved.steamid64;

  const [teamMembership, trustCounts, commentsPage, commentEligibility] =
    await Promise.all([
      getPlayerTeamForProfile(resolved.steamid64),
      getPlayerProfileTrustCounts(resolved.steamid64),
      listCommentsForSubject(resolved.steamid64),
      getProfileCommentEligibilityForViewer({
        subjectSteamid64: resolved.steamid64,
        isProfileOwner: isOwner,
      }),
    ]);

  // Emoji reactions for the visible comments + the profile itself.
  const commentIds = collectTreeCommentIds(commentsPage.trees);
  const [reactionsMap, profileReactions] = await Promise.all([
    getReactionsForTargets("player_comment", commentIds),
    getReactionsForTarget("player_profile", resolved.steamid64),
  ]);
  const reactionsByComment = Object.fromEntries(reactionsMap);

  return (
    <PlayerProfile
      steamid64={resolved.steamid64}
      linkedUsername={resolved.linkedUsername}
      fullName={resolved.fullName}
      countryFlag={resolved.countryFlag}
      anthemUrl={resolved.anthemUrl}
      socialLinks={resolved.socialLinks}
      isOwner={isOwner}
      team={teamMembership?.team ?? null}
      trustCounts={trustCounts}
      commentsPage={commentsPage}
      commentEligibility={commentEligibility}
      viewerUserId={viewer?.user.id ?? null}
      viewerAuthor={viewerAuthorFromProfiles(viewer)}
      reactionsByComment={reactionsByComment}
      profileReactions={profileReactions}
    />
  );
}

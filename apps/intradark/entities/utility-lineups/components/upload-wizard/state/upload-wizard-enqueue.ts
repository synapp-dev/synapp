import { toast } from "sonner";

import { createEnemyPovUploadJobAction } from "@/entities/utility-lineups/actions/enemy-pov-upload-job-actions";
import { createUtilityLineupUploadJobAction } from "@/entities/utility-lineups/actions/user-upload-job-actions";
import type { UtilityLineupTimelineScrubberValues } from "@/entities/utility-lineups/components/utility-lineup-video-timeline-scrubber";
import {
  runEnemyPovUploadPipeline,
  runUtilityLineupJobUploadPipeline,
} from "@/entities/utility-lineups/lib/utility-lineup-job-upload-pipeline";
import { useUtilityLineupUploadQueueStore } from "@/entities/utility-lineups/lib/utility-lineup-upload-queue-store";
import type { UtilityLineupUploadJobCreateInput } from "@/entities/utility-lineups/lib/user-lineup-submit-schema";

import { resolvedVideoContentType } from "../helpers";
import type {
  GrenadeType,
  MarginType,
  MovementType,
  SideType,
  TechniqueType,
  UtilityMapPickerOption,
} from "../types";

export type RunUploadWizardEnqueueInput = {
  file: File;
  throwNorm: { x: number; y: number };
  landNorm: { x: number; y: number };
  selectedMap: UtilityMapPickerOption;
  throwLabel: string;
  landLabel: string;
  grenadeType: GrenadeType;
  side: SideType;
  movement: MovementType;
  resolvedTechnique: TechniqueType;
  margin: MarginType;
  timeline: UtilityLineupTimelineScrubberValues;
  description: string;
  enemyPovFile: File | null;
  enemyPovDescription: string;
  enemyPovTimeline: { videoStartMs: number; videoEndMs: number | null };
  onOpenChange: (open: boolean) => void;
};

export type RunUploadWizardEnqueueResult =
  | { ok: true }
  | { ok: false; message: string };

export async function runUploadWizardEnqueue(
  input: RunUploadWizardEnqueueInput,
): Promise<RunUploadWizardEnqueueResult> {
  const {
    file,
    throwNorm,
    landNorm,
    selectedMap,
    throwLabel,
    landLabel,
    grenadeType,
    side,
    movement,
    resolvedTechnique,
    margin,
    timeline,
    description,
    enemyPovFile,
    enemyPovDescription,
    enemyPovTimeline,
    onOpenChange,
  } = input;

  const payload: UtilityLineupUploadJobCreateInput = {
    mapId: selectedMap.id,
    mapSlug: selectedMap.slug,
    throwSpotX: throwNorm.x,
    throwSpotY: throwNorm.y,
    landSpotX: landNorm.x,
    landSpotY: landNorm.y,
    throwLabel: throwLabel.trim(),
    landLabel: landLabel.trim(),
    grenadeType,
    side,
    movement,
    technique: resolvedTechnique,
    margin,
    videoStartMs: timeline.videoStartMs,
    videoEndMs: timeline.videoEndMs,
    stillStandMs: timeline.stillStandMs,
    stillThrowMs: timeline.stillThrowMs,
    stillLandMs: timeline.stillLandMs,
    grenadeReleaseMs: timeline.grenadeReleaseMs,
    grenadeBloomMs: timeline.grenadeBloomMs,
    description: description.trim(),
    setposText: null,
    youtubeUrl: null,
    lineupImageUrl: null,
    videoContentType: resolvedVideoContentType(file),
    videoByteLength: file.size,
  };

  const created = await createUtilityLineupUploadJobAction(payload);
  if (!created.ok) {
    toast.error(created.message);
    return { ok: false, message: created.message };
  }

  const lineupJobId = created.jobId;
  const enemyPovFileSnapshot = enemyPovFile;
  const enemyPovDescriptionSnapshot = enemyPovDescription.trim();
  const enemyPovTimelineSnapshot = enemyPovTimeline;
  const grenadeTypeSnapshot = grenadeType;
  const mapSlugSnapshot = selectedMap.slug;

  const store = useUtilityLineupUploadQueueStore.getState();
  store.registerPendingFile(lineupJobId, file);
  store.setJobProgress(lineupJobId, 0);
  void runUtilityLineupJobUploadPipeline({
    jobId: lineupJobId,
    file,
    onProgress: (pct) => store.setJobProgress(lineupJobId, pct),
  }).then(async (r) => {
    store.clearJobProgress(lineupJobId);
    if (!r.ok) {
      toast.error(r.message);
      store.notifyJobsMutated();
      return;
    }
    store.clearPendingFile(lineupJobId);
    toast.success("Lineup submitted for review.");
    store.notifyJobsMutated();

    if (!enemyPovFileSnapshot) return;

    const povCreated = await createEnemyPovUploadJobAction({
      lineupId: r.lineupId,
      mapSlug: mapSlugSnapshot,
      grenadeType: grenadeTypeSnapshot,
      description: enemyPovDescriptionSnapshot || null,
      videoStartMs: enemyPovTimelineSnapshot.videoStartMs,
      videoEndMs: enemyPovTimelineSnapshot.videoEndMs,
      videoContentType: resolvedVideoContentType(enemyPovFileSnapshot),
      videoByteLength: enemyPovFileSnapshot.size,
    });
    if (!povCreated.ok) {
      toast.error(`Enemy POV: ${povCreated.message}`);
      return;
    }

    const povJobId = povCreated.jobId;
    store.registerPendingFile(povJobId, enemyPovFileSnapshot);
    store.setJobProgress(povJobId, 0);
    store.notifyJobsMutated();

    const povResult = await runEnemyPovUploadPipeline({
      jobId: povJobId,
      file: enemyPovFileSnapshot,
      onProgress: (pct) => store.setJobProgress(povJobId, pct),
    });
    store.clearJobProgress(povJobId);
    if (povResult.ok) {
      store.clearPendingFile(povJobId);
      toast.success("Enemy POV uploaded.");
    } else {
      toast.error(`Enemy POV: ${povResult.message}`);
    }
    store.notifyJobsMutated();
  });

  onOpenChange(false);
  toast.message("Upload queued — watch progress in the header.");
  return { ok: true };
}

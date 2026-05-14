import { create } from "zustand";

type State = {
  jobProgress: Record<string, number>;
  pendingFiles: Record<string, File>;
  bumpListVersion: number;
  setJobProgress: (jobId: string, pct: number) => void;
  clearJobProgress: (jobId: string) => void;
  registerPendingFile: (jobId: string, file: File) => void;
  takePendingFile: (jobId: string) => File | undefined;
  clearPendingFile: (jobId: string) => void;
  notifyJobsMutated: () => void;
};

export const useUtilityLineupUploadQueueStore = create<State>((set, get) => ({
  jobProgress: {},
  pendingFiles: {},
  bumpListVersion: 0,
  setJobProgress: (jobId, pct) =>
    set((s) => ({ jobProgress: { ...s.jobProgress, [jobId]: pct } })),
  clearJobProgress: (jobId) =>
    set((s) => {
      const jobProgress = { ...s.jobProgress };
      delete jobProgress[jobId];
      return { jobProgress };
    }),
  registerPendingFile: (jobId, file) =>
    set((s) => ({
      pendingFiles: { ...s.pendingFiles, [jobId]: file },
    })),
  takePendingFile: (jobId) => get().pendingFiles[jobId],
  clearPendingFile: (jobId) =>
    set((s) => {
      const pendingFiles = { ...s.pendingFiles };
      delete pendingFiles[jobId];
      return { pendingFiles };
    }),
  notifyJobsMutated: () =>
    set((s) => ({ bumpListVersion: s.bumpListVersion + 1 })),
}));

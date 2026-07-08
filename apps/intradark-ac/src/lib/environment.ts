/** Environment attestation snapshot (mirrors the Rust `Environment` struct). */
export type Environment = {
  tpmPresent: boolean;
  secureBoot: boolean;
  iommu: boolean;
  vbs: boolean;
  osBuild: string;
};

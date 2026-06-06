"use client";

import * as React from "react";

import { useUploadWizardState } from "./use-upload-wizard-state";
import type {
  UploadWizardContextValue,
  UploadWizardProviderProps,
} from "./upload-wizard-types";

export type {
  UploadWizardContextValue,
  UploadWizardProviderProps,
} from "./upload-wizard-types";

const UploadWizardContext = React.createContext<UploadWizardContextValue | null>(
  null,
);

export function useUploadWizard(): UploadWizardContextValue {
  const ctx = React.useContext(UploadWizardContext);
  if (!ctx) {
    throw new Error("useUploadWizard must be used within UploadWizardProvider");
  }
  return ctx;
}

export function UploadWizardProvider({
  children,
  ...input
}: UploadWizardProviderProps) {
  const value = useUploadWizardState(input);

  return (
    <UploadWizardContext.Provider value={value}>
      {children}
    </UploadWizardContext.Provider>
  );
}

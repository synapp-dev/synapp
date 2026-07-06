"use client";

import { createContext, useContext } from "react";
import type { SchoolDetailContextValue } from "./types";

const SchoolDetailContext = createContext<SchoolDetailContextValue | null>(
  null
);

export function SchoolDetailProvider({
  value,
  children,
}: {
  value: SchoolDetailContextValue;
  children: React.ReactNode;
}) {
  return (
    <SchoolDetailContext.Provider value={value}>
      {children}
    </SchoolDetailContext.Provider>
  );
}

export function useSchoolDetail() {
  const context = useContext(SchoolDetailContext);
  if (!context) {
    throw new Error("useSchoolDetail must be used within SchoolDetailProvider");
  }
  return context;
}

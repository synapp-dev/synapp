// lib/api/client.ts
import { schoolApi } from "@/entities/school/api/endpoints";

// Aggregate domain-specific endpoint groups here. This keeps the public
// surface area tidy while letting each domain own its routes.
export const api = {
  ...schoolApi,
};

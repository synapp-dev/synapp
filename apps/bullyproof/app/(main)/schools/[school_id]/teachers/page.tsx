import { generateMetadataFromSegments } from "@/utils/metadata";
import TeachersPageClient from "./teachers-page-client";

export const metadata = generateMetadataFromSegments(["schools", "teachers"]);

export default function TeachersPage() {
  // School data is already in the store from the layout's SchoolStoreProvider
  return <TeachersPageClient />;
}

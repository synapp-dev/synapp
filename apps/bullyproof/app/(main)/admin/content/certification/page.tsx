import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments([
  "admin",
  "content",
  "certification",
]);

export default function CertificationPage() {
  return <div>CertificationPage</div>;
}

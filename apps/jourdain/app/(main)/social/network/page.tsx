import { Network } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function SocialNetworkPage() {
  return (
    <ComingSoon
      title="Network"
      description="Your wider circle, mapped: how you know people, who connects whom, and where to invest."
      icon={Network}
      bullets={["Relationship map", "Introductions", "Circles"]}
    />
  );
}

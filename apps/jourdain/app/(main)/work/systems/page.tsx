import { Server } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function WorkSystemsPage() {
  return (
    <ComingSoon
      title="Systems"
      description="The playbooks and automations that keep work running without holding it all in your head."
      icon={Server}
      bullets={["Playbooks", "Automations", "Recurring checklists"]}
    />
  );
}

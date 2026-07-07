import { Video } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function WorkMeetingsPage() {
  return (
    <ComingSoon
      title="Meetings"
      description="Agendas in, decisions out: every meeting captured with owners and follow-ups that actually happen."
      icon={Video}
      bullets={["Agendas", "Decision log", "Action follow-ups"]}
    />
  );
}

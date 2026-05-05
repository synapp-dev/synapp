import { MatchSandboxPanel } from "@/components/organisms/match-sandbox-panel";

export default function MatchLabPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Match Sandbox</h1>
      </div>

      <MatchSandboxPanel />
    </div>
  );
}

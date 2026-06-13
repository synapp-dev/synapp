import { InsightsShell } from "@/app/(main)/[organisation]/[venue]/insights/_components/insights-shell";

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InsightsShell>{children}</InsightsShell>;
}

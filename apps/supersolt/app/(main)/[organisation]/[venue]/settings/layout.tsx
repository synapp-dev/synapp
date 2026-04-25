import { SettingsLayoutClient } from "@/app/(main)/[organisation]/[venue]/settings/_components/settings-layout-client";

export default function SettingsSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsLayoutClient>{children}</SettingsLayoutClient>;
}

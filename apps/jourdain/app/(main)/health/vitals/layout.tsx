import { VitalsTabNav } from "@/components/organisms/vitals-tab-nav";

export default function VitalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Vitals</h1>
        <VitalsTabNav />
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

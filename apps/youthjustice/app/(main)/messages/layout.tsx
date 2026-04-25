import { MessagesLayoutShell } from "@/components/organisms/messages-layout-shell";

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-6 flex min-h-0 w-[calc(100%+3rem)] min-w-0 flex-1 flex-col overflow-hidden">
      <MessagesLayoutShell>{children}</MessagesLayoutShell>
    </div>
  );
}

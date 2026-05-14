export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="-my-3 flex min-h-0 flex-col"
      style={{ height: "calc(100dvh - 4rem)" }}
    >
      {children}
    </div>
  );
}

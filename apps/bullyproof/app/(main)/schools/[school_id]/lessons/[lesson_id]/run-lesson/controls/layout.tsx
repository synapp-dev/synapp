export default function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-fullscreen bg-background overflow-hidden">
      <div className="h-full w-full p-6">
        {children}
      </div>
    </div>
  );
}

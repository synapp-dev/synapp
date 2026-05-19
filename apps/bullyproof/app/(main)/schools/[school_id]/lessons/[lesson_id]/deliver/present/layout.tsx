export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-fullscreen overflow-hidden w-full">
      {children}
    </div>
  );
}

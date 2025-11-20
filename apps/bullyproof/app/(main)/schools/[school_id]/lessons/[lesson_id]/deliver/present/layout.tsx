export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden w-full">
      {children}
    </div>
  );
}

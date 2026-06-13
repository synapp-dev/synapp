export function SectionPlaceholder({
  title,
  section,
}: {
  title: string;
  section: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">
        {section} — page scaffold. Content will be wired up next.
      </p>
    </div>
  );
}

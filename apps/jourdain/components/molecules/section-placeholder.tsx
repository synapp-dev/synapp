type SectionPlaceholderProps = {
  title: string;
  description?: string;
};

export function SectionPlaceholder({
  title,
  description = "Coming soon.",
}: SectionPlaceholderProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

type ScopedPlaceholderPageProps = {
  title: string;
  description?: string;
  organisation: string;
  venue: string;
};

export function ScopedPlaceholderPage({
  title,
  description,
  organisation,
  venue,
}: ScopedPlaceholderPageProps) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">
        {description ?? "Coming soon."}
      </p>
      <p className="text-muted-foreground text-sm">
        Organisation: <span className="font-medium">{organisation}</span> | Venue:{" "}
        <span className="font-medium">{venue}</span>
      </p>
    </section>
  );
}

export default async function TeamUpcomingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Team Upcoming</h1>
      <p className="text-muted-foreground mt-2">Team slug: {slug}</p>
    </div>
  );
}

import Link from "next/link";

export default function PlayersPage() {
  return (
    <div className="flex flex-col gap-3 py-2 text-sm text-muted-foreground">
      <p>Player directory is not wired up yet.</p>
      <Link
        href="/players/niko"
        className="w-fit font-medium text-primary underline-offset-4 hover:underline"
      >
        Open demo profile
      </Link>
    </div>
  );
}

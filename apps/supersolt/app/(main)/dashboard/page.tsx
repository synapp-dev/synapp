import { redirectToScopedVenuePath } from "@/server/access/redirect-to-scoped-venue-path";

export default async function DashboardRedirectPage() {
  await redirectToScopedVenuePath("dashboard");
}

import { redirect } from "next/navigation";

import { DEFAULT_CASE_SLUG } from "@/lib/dummy-cases";

export default function HomePage() {
  redirect(`/cases/${DEFAULT_CASE_SLUG}/correspondence`);
}

import type { Metadata } from "next";

import { RequestsClient } from "./requests-client";

export const metadata: Metadata = { title: "Requests" };

export default function RequestsPage() {
  return <RequestsClient />;
}

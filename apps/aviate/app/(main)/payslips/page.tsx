import type { Metadata } from "next";

import { PayslipsClient } from "./payslips-client";

export const metadata: Metadata = { title: "Payslips" };

export default function PayslipsPage() {
  return <PayslipsClient />;
}

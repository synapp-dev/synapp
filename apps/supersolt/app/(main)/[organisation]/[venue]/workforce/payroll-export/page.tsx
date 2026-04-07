import { PayrollExportPageClient } from "@/app/(main)/[organisation]/[venue]/workforce/payroll-export/_components/payroll-export-page-client";

export default async function WorkforcePayrollExportPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <PayrollExportPageClient organisation={organisation} venue={venue} />;
}

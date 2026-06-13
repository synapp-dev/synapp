import { PayrollExportPage } from "@/entities/workforce/payroll-export/components/payroll-export-page";

export default async function WorkforcePayrollExportPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  return <PayrollExportPage organisation={organisation} venue={venue} />;
}

import { requireDeveloperOr404 } from "../_lib/require-developer";
import { AdminModulePlaceholder } from "../_components/admin-module-placeholder";

export const dynamic = "force-dynamic";

export default async function AdminScrimsPage() {
  await requireDeveloperOr404();
  return <AdminModulePlaceholder href="/admin/scrims" />;
}

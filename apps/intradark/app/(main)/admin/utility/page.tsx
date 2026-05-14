import { redirect } from "next/navigation";

/** @deprecated Use `/admin/maps`. */
export default function AdminUtilityRedirectPage() {
  redirect("/admin/maps");
}

import { redirect } from "next/navigation";

export default function VitalsIndexPage() {
  redirect("/health/vitals/body-composition");
}

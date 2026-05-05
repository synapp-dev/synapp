import { redirect } from "next/navigation";
import { createServerClient } from "@/utils/supabase/server";

export default async function RootPage() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/dashboard" : "/auth");
  } catch {
    redirect("/auth");
  }
}

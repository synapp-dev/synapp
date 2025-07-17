import { getUsers as getUsersFromProvider } from "@/providers/supabase/supabaseProvider";

export async function getUsers() {
  // Add any business logic here (validation, transformation, etc.)
  return getUsersFromProvider();
}

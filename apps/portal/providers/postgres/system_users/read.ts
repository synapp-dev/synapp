import { db } from "@/providers/postgres/drizzle/drizzle-client";
import { system_users } from "@/providers/postgres/drizzle/schema";
import { Database } from "@/types/supabase";
import { eq } from "drizzle-orm";

export type SystemUser = Database["public"]["Tables"]["system_users"]["Row"];

export async function getAllSystemUsers(): Promise<SystemUser[]> {
  const result = await db.select().from(system_users);
  return result as SystemUser[];
}

export async function getSystemUserById(
  userId: string
): Promise<SystemUser | null> {
  const result = await db
    .select()
    .from(system_users)
    .where(eq(system_users.id, userId));
  return result[0] as SystemUser | null;
}

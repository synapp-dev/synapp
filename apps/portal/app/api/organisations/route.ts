import { NextResponse } from "next/server";
import {
  getAllOrganisations,
  Organisation,
} from "@/providers/postgres/organisations/read";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { db } from "@/providers/postgres/drizzle/drizzle-client";
// import { permissions } from "@/providers/postgres/drizzle/schema";

export async function GET(request: Request) {
  console.log("api hit");
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", data: [] },
      { status: 401 }
    );
  }

  console.log("userId", userId);

  // Example permission check (replace with your actual logic)
  // const userPerms = await db.select().from(permissions).where(...);
  // if (!userPerms.includes('can_view_organisations')) {
  //   return NextResponse.json({ success: false, error: 'Forbidden', data: [] }, { status: 403 });
  // }

  try {
    const allOrgs: Organisation[] = await getAllOrganisations();
    return NextResponse.json({ success: true, data: allOrgs });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message, data: [] },
      { status: 500 }
    );
  }
}

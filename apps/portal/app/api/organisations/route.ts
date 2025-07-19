import { NextResponse } from "next/server";
import {
  getAllOrganisations,
  Organisation,
} from "@/providers/postgres/organisations/read";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", data: [] },
      { status: 401 }
    );
  }

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

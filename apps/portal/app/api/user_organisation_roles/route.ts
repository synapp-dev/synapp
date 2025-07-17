import { NextResponse } from "next/server";
import { getAllUserOrganisationRoles } from "@/providers/postgres/user_organisation_roles/read";
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
    const allRoles = await getAllUserOrganisationRoles();
    return NextResponse.json({ success: true, data: allRoles });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message, data: [] },
      { status: 500 }
    );
  }
}

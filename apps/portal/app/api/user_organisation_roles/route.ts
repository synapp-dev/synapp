import { NextResponse } from "next/server";
import { getUserOrganisationRolesByUserId } from "@/providers/postgres/user_organisation_roles/read";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id") || getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", data: [] },
      { status: 401 }
    );
  }

  try {
    const roles = await getUserOrganisationRolesByUserId(userId);
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message, data: [] },
      { status: 500 }
    );
  }
}

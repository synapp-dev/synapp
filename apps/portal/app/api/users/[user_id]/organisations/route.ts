import { NextResponse } from "next/server";
import { getUserOrganisationRolesByUserId } from "@/providers/postgres/user_organisation_roles/read";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const { user_id } = await params;
  if (!user_id) {
    return NextResponse.json(
      { success: false, error: "User ID required", data: [] },
      { status: 400 }
    );
  }
  try {
    const roles = await getUserOrganisationRolesByUserId(user_id);
    // Extract only the organisation objects, filter out nulls/empties
    const organisations = roles
      .map((r) => r.organisation)
      .filter((org) => org && org.id);
    return NextResponse.json({ success: true, data: organisations });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message, data: [] },
      { status: 500 }
    );
  }
}

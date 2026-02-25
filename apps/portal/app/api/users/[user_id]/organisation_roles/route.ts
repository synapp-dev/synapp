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
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message, data: [] },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const { user_id } = await params;
  if (!user_id) {
    return NextResponse.json(
      { success: false, error: "User ID required", data: null },
      { status: 400 }
    );
  }
  
  try {
    const data = await req.json();
    // TODO: Implement createUserOrganisationRole function in providers
    // const result = await createUserOrganisationRole(user_id, data);
    return NextResponse.json({ 
      success: false, 
      error: "POST not implemented yet",
      data: null 
    }, { status: 501 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message, data: null },
      { status: 500 }
    );
  }
} 
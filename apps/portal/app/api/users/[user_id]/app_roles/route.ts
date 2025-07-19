import { NextResponse } from "next/server";
import { getUserAppRolesByUserId } from "@/providers/postgres/user_app_roles/read";

export async function GET(
  _req: Request,
  { params }: { params: { user_id: string } }
) {
  const { user_id } = params;
  if (!user_id) {
    return NextResponse.json(
      { success: false, error: "User ID required", data: [] },
      { status: 400 }
    );
  }
  try {
    const roles = await getUserAppRolesByUserId(user_id);
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
  { params }: { params: { user_id: string } }
) {
  const { user_id } = params;
  if (!user_id) {
    return NextResponse.json(
      { success: false, error: "User ID required", data: null },
      { status: 400 }
    );
  }
  
  try {
    const data = await req.json();
    // TODO: Implement createUserAppRole function in providers
    // const result = await createUserAppRole(user_id, data);
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
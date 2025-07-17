import { NextResponse } from "next/server";
import { getSystemUserById } from "@/providers/postgres/system_users/read";

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Missing user id in header", data: null },
      { status: 400 }
    );
  }

  try {
    const user = await getSystemUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found", data: null },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message, data: null },
      { status: 500 }
    );
  }
}

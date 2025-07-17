import { NextResponse } from "next/server";
import { getAllSystemUsers } from "@/providers/postgres/system_users/read";

export async function GET(request: Request) {
  try {
    const users = await getAllSystemUsers();
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message, data: [] },
      { status: 500 }
    );
  }
}

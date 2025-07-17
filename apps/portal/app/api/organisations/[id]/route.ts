import { NextResponse } from "next/server";
import {
  getOrganisationById,
  Organisation,
} from "@/providers/postgres/organisations/read";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const org: Organisation | null = await getOrganisationById(params.id);
    if (!org) {
      return NextResponse.json(
        { success: false, error: "Organisation not found", data: null },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: org });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message, data: null },
      { status: 500 }
    );
  }
}

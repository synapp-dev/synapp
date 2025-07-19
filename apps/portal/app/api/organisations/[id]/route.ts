import { NextResponse } from "next/server";
import {
  getOrganisationById,
  getOrganisationBySlug,
  Organisation,
} from "@/providers/postgres/organisations/read";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    // Early exit if no ID provided
    if (!resolvedParams?.id || resolvedParams.id.trim() === '') {
      return NextResponse.json(
        { success: false, error: "Organisation ID is required", data: null },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    // Get organisation by slug if provided, otherwise by ID
    const org: Organisation | null = slug === 'true' ? await getOrganisationBySlug(resolvedParams.id) : await getOrganisationById(resolvedParams.id);
      
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    // Early parameter validation
    if (!resolvedParams?.id || resolvedParams.id.trim() === '') {
      return NextResponse.json(
        { success: false, error: "Organisation ID is required", data: null },
        { status: 400 }
      );
    }

    // Implementation for updating organisation
    // You'll need to implement this based on your update logic
    return NextResponse.json({ 
      success: false, 
      error: "PUT not implemented yet",
      data: null 
    }, { status: 501 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message, data: null },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    // Early parameter validation
    if (!resolvedParams?.id || resolvedParams.id.trim() === '') {
      return NextResponse.json(
        { success: false, error: "Organisation ID is required", data: null },
        { status: 400 }
      );
    }

    // Implementation for deleting organisation
    // You'll need to implement this based on your delete logic
    return NextResponse.json({ 
      success: false, 
      error: "DELETE not implemented yet",
      data: null 
    }, { status: 501 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message, data: null },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

// Example GET endpoint
export async function GET() {
  try {
    // Example data - replace with your actual data fetching logic
    const exampleData = {
      message: "Hello from the example API!",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(exampleData);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch example data" },
      { status: 500 }
    );
  }
}

// Example POST endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Example processing - replace with your actual logic
    const processedData = {
      ...body,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(processedData, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create example data" },
      { status: 500 }
    );
  }
}

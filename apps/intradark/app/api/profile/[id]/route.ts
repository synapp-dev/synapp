import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const steamId = params.id;

    // Validate Steam ID (basic validation - Steam IDs are typically 17 digits)
    if (!steamId || !/^\d{17}$/.test(steamId)) {
      return NextResponse.json(
        { error: 'Invalid Steam ID. Must be a 17-digit number.' },
        { status: 400 }
      );
    }

    // Fetch data from Leetify API
    const leetifyResponse = await fetch(
      `https://api.cs-prod.leetify.com/api/profile/id/${steamId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!leetifyResponse.ok) {
      if (leetifyResponse.status === 404) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        );
      }
      throw new Error(`Leetify API error: ${leetifyResponse.status}`);
    }

    console.log(leetifyResponse);

    const profileData = await leetifyResponse.json();

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
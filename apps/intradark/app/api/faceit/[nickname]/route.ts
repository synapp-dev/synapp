import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { nickname: string } }
) {
  try {
    const nickname = params.nickname;

    // Validate nickname (basic validation - must not be empty and contain valid characters)
    if (!nickname || nickname.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid nickname. Must not be empty.' },
        { status: 400 }
      );
    }

    // Sanitize nickname (remove potentially harmful characters)
    const sanitizedNickname = encodeURIComponent(nickname.trim());

    // Fetch data from Faceit API
    const faceitResponse = await fetch(
      `https://www.faceit.com/api/users/v1/nicknames/${sanitizedNickname}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!faceitResponse.ok) {
      if (faceitResponse.status === 404) {
        return NextResponse.json(
          { error: 'Faceit profile not found' },
          { status: 404 }
        );
      }
      throw new Error(`Faceit API error: ${faceitResponse.status}`);
    }

    const faceitData = await faceitResponse.json();

    return NextResponse.json(faceitData);
  } catch (error) {
    console.error('Error fetching Faceit profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { getCalendarContext } from "@/lib/google/client";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const context = await getCalendarContext(user.id);
  if (!context) {
    return NextResponse.json(
      { data: null, error: { message: "Google Calendar is not connected" } },
      { status: 409 }
    );
  }

  const { eventId } = await params;
  try {
    await context.calendar.events.delete({ calendarId: "primary", eventId });
    return NextResponse.json({ data: { id: eventId }, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Failed to delete event",
        },
      },
      { status: 502 }
    );
  }
}

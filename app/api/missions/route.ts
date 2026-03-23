// app/api/missions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMissions, createMission } from "@/lib/localDb";
import { pushMissionNotification } from "@/lib/onesignal";
import type { CreateMissionBody, Mission, MissionStatus, ApiResponse } from "@/lib/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const statusFilter   = searchParams.get("status") as MissionStatus | undefined;
  const driverIdFilter = searchParams.get("driver_id") ?? undefined;
  try {
    const missions = await getMissions({
      ...(statusFilter   ? { status: statusFilter }      : {}),
      ...(driverIdFilter ? { driver_id: driverIdFilter } : {}),
    });
    return NextResponse.json({ data: missions, error: null });
  } catch (err) {
    console.error("[GET /api/missions]", err);
    return NextResponse.json({ data: null, error: "Failed to fetch missions." }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<Mission>>> {
  let body: CreateMissionBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ data: null, error: "Invalid JSON body." }, { status: 400 }); }

  const { pickup_location, destination, passengers, created_by, priority, assigned_driver_id, broadcast } = body;

  if (!pickup_location?.trim())  return NextResponse.json({ data: null, error: "pickup_location is required." }, { status: 400 });
  if (!destination?.trim())      return NextResponse.json({ data: null, error: "destination is required."     }, { status: 400 });
  if (!created_by?.trim())       return NextResponse.json({ data: null, error: "created_by is required."      }, { status: 400 });
  if (!passengers || passengers < 1) return NextResponse.json({ data: null, error: "passengers must be at least 1." }, { status: 400 });
  if (broadcast && assigned_driver_id)
    return NextResponse.json({ data: null, error: "Cannot be both broadcast and assigned." }, { status: 400 });

  try {
    const mission = await createMission({
      pickup_location:    pickup_location.trim(),
      destination:        destination.trim(),
      passengers:         Number(passengers),
      priority:           priority ?? "normal",
      status:             "pending",
      broadcast:          broadcast ?? false,
      assigned_driver_id: assigned_driver_id ?? null,
      created_by,
      created_at:         new Date().toISOString(),
      accepted_at:        null,
      completed_at:       null,
    });
    // Fire-and-forget push — don't block the response
    pushMissionNotification(pickup_location.trim());
    return NextResponse.json({ data: mission, error: null }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/missions]", err);
    return NextResponse.json({ data: null, error: "Failed to create mission." }, { status: 500 });
  }
}

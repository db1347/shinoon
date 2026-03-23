// app/api/missions/[id]/status/route.ts
// PATCH /api/missions/[id]/status — advance a mission through its lifecycle

import { NextRequest, NextResponse } from "next/server";
import { getMissionById, updateMission, updateUserStatus } from "@/lib/localDb";
import {
  DRIVER_STATUS_TRANSITIONS,
  MANAGER_STATUS_TRANSITIONS,
  type Mission,
  type MissionStatus,
  type UpdateMissionStatusBody,
  type ApiResponse,
} from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Mission>>> {
  const { id: missionId } = await context.params;
  if (!missionId)
    return NextResponse.json({ data: null, error: "Mission ID is required." }, { status: 400 });

  let body: UpdateMissionStatusBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ data: null, error: "Invalid JSON body." }, { status: 400 });
  }

  const { status: nextStatus, driver_id, caller_role } = body;
  if (!nextStatus)
    return NextResponse.json({ data: null, error: "status is required." }, { status: 400 });

  const mission = await getMissionById(missionId);
  if (!mission)
    return NextResponse.json({ data: null, error: "Mission not found." }, { status: 404 });

  const currentStatus = mission.status as MissionStatus;
  const callerRole: "manager" | "driver" = caller_role ?? "driver";

  // Drivers may only update their own mission
  if (callerRole === "driver") {
    if (mission.assigned_driver_id && driver_id && mission.assigned_driver_id !== driver_id)
      return NextResponse.json({ data: null, error: "Not authorized to update this mission." }, { status: 403 });
  }

  // Validate transition
  const allowed = callerRole === "manager"
    ? MANAGER_STATUS_TRANSITIONS[currentStatus]
    : DRIVER_STATUS_TRANSITIONS[currentStatus];

  if (!allowed.includes(nextStatus))
    return NextResponse.json(
      { data: null, error: `Invalid transition: '${currentStatus}' → '${nextStatus}'. Allowed: [${allowed.join(", ") || "none"}].` },
      { status: 422 }
    );

  const patch: Partial<Mission> = { status: nextStatus };

  if (nextStatus === "accepted") {
    patch.accepted_at = new Date().toISOString();
    // Claim broadcast mission
    if (mission.broadcast && !mission.assigned_driver_id) {
      if (!driver_id)
        return NextResponse.json({ data: null, error: "driver_id required to accept a broadcast mission." }, { status: 400 });
      patch.assigned_driver_id = driver_id;
    }
  }

  if (nextStatus === "completed") {
    patch.completed_at = new Date().toISOString();
  }

  const updated = await updateMission(missionId, patch);
  if (!updated)
    return NextResponse.json({ data: null, error: "Failed to update mission." }, { status: 500 });

  // Sync driver availability
  const driverToSync = (patch.assigned_driver_id ?? mission.assigned_driver_id) as string | null;
  if (driverToSync) {
    const driverStatus =
      nextStatus === "en_route"  ? "on_mission" :
      nextStatus === "completed" ? "available"  :
      nextStatus === "cancelled" ? "available"  : null;
    if (driverStatus) await updateUserStatus(driverToSync, driverStatus);
  }

  return NextResponse.json({ data: updated, error: null });
}

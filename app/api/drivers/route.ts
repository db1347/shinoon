// app/api/drivers/route.ts
// GET /api/drivers — return all drivers with their current status

import { NextRequest, NextResponse } from "next/server";
import { getDrivers } from "@/lib/localDb";
import type { ApiResponse, User } from "@/lib/types";

export async function GET(_req: NextRequest): Promise<NextResponse<ApiResponse<User[]>>> {
  try {
    const drivers = await getDrivers();
    return NextResponse.json({ data: drivers, error: null });
  } catch (err) {
    console.error("[GET /api/drivers]", err);
    return NextResponse.json({ data: null, error: "Failed to fetch drivers." }, { status: 500 });
  }
}

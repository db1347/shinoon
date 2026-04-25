// app/api/drivers/route.ts
// GET /api/drivers — return all drivers with their current status

import { NextResponse } from "next/server";
import { getDrivers } from "@/lib/localDb";
import { createLogger } from "@/lib/logger";
import type { ApiResponse, User } from "@/lib/types";

const log = createLogger("api:drivers");

export async function GET(): Promise<NextResponse<ApiResponse<User[]>>> {
  try {
    const drivers = await getDrivers();
    return NextResponse.json({ data: drivers, error: null });
  } catch (err) {
    log.error("GET /api/drivers failed", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch drivers." },
      { status: 500 }
    );
  }
}

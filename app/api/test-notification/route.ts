// app/api/test-notification/route.ts — temporary debug route
import { NextResponse } from "next/server";
import { pushMissionNotification } from "@/lib/onesignal";

export async function POST() {
  console.log("[TEST] Firing test push notification");
  await pushMissionNotification("בדיקה — TEST NOTIFICATION");
  return NextResponse.json({ ok: true });
}

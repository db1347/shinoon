// app/api/test-notification/route.ts
// POST — fan out a test notification to every stored push subscription.

import { NextResponse } from "next/server";
import { sendPushToAll } from "@/lib/push";
import { getPushSubscriptions } from "@/lib/localDb";
import type { ApiResponse } from "@/lib/types";

interface TestResult {
  sent: number;
  failed: number;
  removedExpired: number;
  subscribers: number;
  vapidConfigured: boolean;
}

export async function POST(): Promise<NextResponse<ApiResponse<TestResult>>> {
  const vapidConfigured =
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    !!process.env.VAPID_PRIVATE_KEY;

  const subscribers = (await getPushSubscriptions()).length;

  const result = await sendPushToAll({
    title: "בדיקת התראה",
    body:  "אם אתה רואה את זה — ההתראות עובדות",
    url:   "/driver",
    tag:   "shinoon-test",
  });

  return NextResponse.json({
    data: {
      sent: result.sent,
      failed: result.failed,
      removedExpired: result.removedExpired,
      subscribers,
      vapidConfigured,
    },
    error: null,
  });
}

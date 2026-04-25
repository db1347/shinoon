// app/api/subscribe/route.ts
// POST   — store a browser PushSubscription
// DELETE — remove one by endpoint

import { NextRequest, NextResponse } from "next/server";
import {
  savePushSubscription,
  removePushSubscription,
} from "@/lib/localDb";
import type { StoredPushSubscription, ApiResponse } from "@/lib/types";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:subscribe");

interface SubscribeBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  let body: SubscribeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { data: null, error: "Missing subscription fields." },
      { status: 400 }
    );
  }

  const record: StoredPushSubscription = {
    endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
    created_at: new Date().toISOString(),
    user_agent: req.headers.get("user-agent"),
  };

  try {
    await savePushSubscription(record);
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err) {
    log.error("failed to save subscription", err);
    return NextResponse.json(
      { data: null, error: "Failed to save subscription." },
      { status: 500 }
    );
  }
}

interface UnsubscribeBody {
  endpoint?: string;
}

export async function DELETE(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  let body: UnsubscribeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body." },
      { status: 400 }
    );
  }
  if (!body.endpoint) {
    return NextResponse.json(
      { data: null, error: "endpoint is required." },
      { status: 400 }
    );
  }
  try {
    await removePushSubscription(body.endpoint);
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err) {
    log.error("failed to remove subscription", err);
    return NextResponse.json(
      { data: null, error: "Failed to remove subscription." },
      { status: 500 }
    );
  }
}

// app/api/test-notification/route.ts — debug route, returns full OneSignal response
import { NextResponse } from "next/server";

export async function POST() {
  const appId  = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    return NextResponse.json({
      ok: false,
      error: "missing env vars",
      appIdSet: !!appId,
      apiKeySet: !!apiKey,
    }, { status: 500 });
  }

  const payload = {
    app_id:            appId,
    target_channel:    "push",
    included_segments: ["Total Subscriptions"],
    headings:          { en: "TEST" },
    contents:          { en: "בדיקת התראה" },
    url:               "https://shinoon.vercel.app/driver",
  };

  try {
    const res = await fetch("https://api.onesignal.com/notifications?c=push", {
      method: "POST",
      headers: {
        "Authorization": `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      onesignalResponse: text,
      payloadSent: payload,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
    }, { status: 500 });
  }
}

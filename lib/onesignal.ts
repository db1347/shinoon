// lib/onesignal.ts — server-side push notification sender

export async function pushMissionNotification(pickup: string) {
  // ONESIGNAL_APP_ID (server-side, no NEXT_PUBLIC_ prefix) is required so it's
  // available at runtime on Vercel without a rebuild.
  const appId  = process.env.ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_REST_API_KEY
  if (!appId || !apiKey) {
    console.warn('[OneSignal] ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY not set — skipping push')
    return
  }
  try {
    const res = await fetch('https://api.onesignal.com/notifications?c=push', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id:            appId,
        target_channel:    'push',
        included_segments: ['Active Subscriptions'],
        headings:          { en: 'שינוע חדש התקבל!' },
        contents:          { en: `איסוף: ${pickup}` },
        url:               'https://shinoon.vercel.app/driver',
      }),
    })
    const body = await res.text()
    if (!res.ok) {
      console.error('[OneSignal] push failed:', res.status, body)
    } else {
      console.log('[OneSignal] push sent:', body)
    }
  } catch (err) {
    console.error('[OneSignal] push error:', err)
  }
}

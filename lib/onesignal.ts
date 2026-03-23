// lib/onesignal.ts — server-side push notification sender

export async function pushMissionNotification(pickup: string) {
  const appId  = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_REST_API_KEY
  if (!appId || !apiKey) {
    console.warn('[OneSignal] ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY not set — skipping push')
    return
  }
  try {
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ['Total Subscriptions'],
        headings: { en: 'שינוע חדש התקבל!' },
        contents: { en: `איסוף: ${pickup}` },
        url:      '/driver',
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('[OneSignal] push failed:', res.status, body)
    }
  } catch (err) {
    console.error('[OneSignal] push error:', err)
  }
}

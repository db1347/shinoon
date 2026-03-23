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
        app_id:            appId,
        target_channel:    'push',
        included_segments: ['Total Subscriptions'],
        headings:          { en: 'שינוע חדש התקבל!' },
        contents:          { en: `איסוף: ${pickup}` },
        url:               `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shinoon.vercel.app'}/driver`,
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

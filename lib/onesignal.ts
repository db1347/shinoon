// lib/onesignal.ts — server-side push notification sender

export async function pushMissionNotification(pickup: string) {
  const appId  = process.env.ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_REST_API_KEY

  console.log('[OneSignal] pushMissionNotification called — appId set:', !!appId, '| apiKey set:', !!apiKey)

  if (!appId || !apiKey) {
    console.warn('[OneSignal] missing env vars — skipping push')
    return
  }

  const payload = {
    app_id:            appId,
    target_channel:    'push',
    included_segments: ['Total Subscriptions'],
    headings:          { en: 'שינוע חדש התקבל!' },
    contents:          { en: `איסוף: ${pickup}` },
    url:               'https://shinoon.vercel.app/driver',
  }

  console.log('[OneSignal] sending payload:', JSON.stringify(payload))

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch('https://api.onesignal.com/notifications?c=push', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const body = await res.text()
    console.log('[OneSignal] response:', res.status, body)
  } catch (err) {
    console.error('[OneSignal] fetch error:', err)
  }
}

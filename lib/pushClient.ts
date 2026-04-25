// lib/pushClient.ts
// Browser-only helpers for the Web Push lifecycle: feature detection,
// registering the service worker, asking for notification permission,
// subscribing with the VAPID public key, and keeping the server in sync.

export type PushStatus =
  | "unknown"       // feature check not done yet
  | "unsupported"   // missing APIs (old iOS Safari, etc.)
  | "needs-install" // iOS PWA must be added to Home Screen first
  | "prompt"        // supported, permission not yet requested
  | "requesting"    // permission prompt showing
  | "denied"        // user said no
  | "granted"       // permission given
  | "subscribed"    // permission granted AND server has our subscription
  | "error";

export interface PushSupport {
  supported: boolean;
  reason?: "no-service-worker" | "no-push-manager" | "no-notifications" | "ios-not-installed";
}

/**
 * Returns whether this browser can receive Web Push. On iOS Safari, push only
 * works when the site is launched as an installed PWA (Home Screen icon).
 */
export function detectPushSupport(): PushSupport {
  if (typeof window === "undefined") return { supported: false, reason: "no-service-worker" };
  if (!("serviceWorker" in navigator)) return { supported: false, reason: "no-service-worker" };
  if (!("PushManager" in window))       return { supported: false, reason: "no-push-manager" };
  if (!("Notification" in window))      return { supported: false, reason: "no-notifications" };

  // iOS quirk: standalone PWA is required for push. Detect via display-mode.
  const ua = navigator.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(ua);
  if (isIos) {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // Legacy Safari
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!isStandalone) return { supported: false, reason: "ios-not-installed" };
  }

  return { supported: true };
}

/**
 * The VAPID public key on the server is base64url. PushManager.subscribe
 * wants a Uint8Array.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  // Use an explicit ArrayBuffer (not SharedArrayBuffer) so the result is a
  // valid BufferSource for PushManager.subscribe in strict TS.
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  // Force a fresh SW fetch so updates to /sw.js propagate quickly.
  const reg = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;
  return reg;
}

/**
 * Full opt-in flow. Safe to call repeatedly; it is idempotent and will reuse
 * any existing subscription.
 */
export async function subscribeToPush(): Promise<PushSubscription> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("VAPID public key not configured");

  const reg = await registerServiceWorker();

  // Reuse an existing subscription if present.
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  return sub;
}

export async function postSubscriptionToServer(sub: PushSubscription): Promise<void> {
  const body = sub.toJSON();
  const res = await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`subscribe failed: ${res.status} ${text}`);
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  try {
    await fetch("/api/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } finally {
    await sub.unsubscribe().catch(() => {});
  }
}

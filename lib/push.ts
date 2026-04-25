// lib/push.ts
// Server-side Web Push sender. Uses the `web-push` package + VAPID keys to
// fan out notifications to every stored subscription.

import webpush from "web-push";
import {
  getPushSubscriptions,
  removePushSubscription,
} from "./localDb";
import { createLogger } from "./logger";

const log = createLogger("push");

let configured = false;
let configuredOk = false;

function configureOnce(): boolean {
  if (configured) return configuredOk;
  configured = true;

  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact    = process.env.VAPID_CONTACT ?? "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    log.warn("VAPID keys missing — push notifications disabled");
    configuredOk = false;
    return false;
  }

  webpush.setVapidDetails(contact, publicKey, privateKey);
  configuredOk = true;
  return true;
}

export interface MissionPushPayload {
  title: string;
  body: string;
  /** URL to open when the user taps the notification. */
  url?: string;
  /** Tag used to collapse repeat notifications in the OS tray. */
  tag?: string;
}

export interface SendPushResult {
  sent: number;
  failed: number;
  removedExpired: number;
}

/**
 * Fan out a push notification to every stored subscription. Automatically
 * removes subscriptions that the browser has invalidated (410/404 responses).
 */
export async function sendPushToAll(
  payload: MissionPushPayload
): Promise<SendPushResult> {
  if (!configureOnce()) {
    return { sent: 0, failed: 0, removedExpired: 0 };
  }

  const subscriptions = await getPushSubscriptions();
  if (subscriptions.length === 0) {
    log.info("no subscribers to push to");
    return { sent: 0, failed: 0, removedExpired: 0 };
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  let removedExpired = 0;

  await Promise.all(
    subscriptions.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body,
          { TTL: 120 } // seconds — drop if undelivered after ~2 min
        );
        sent += 1;
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          // Subscription no longer valid — clean it out.
          await removePushSubscription(sub.endpoint);
          removedExpired += 1;
        } else {
          failed += 1;
          log.error("push delivery failed", {
            endpoint: sub.endpoint.slice(0, 48),
            statusCode,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })
  );

  log.info("push fanout complete", { sent, failed, removedExpired, total: subscriptions.length });
  return { sent, failed, removedExpired };
}

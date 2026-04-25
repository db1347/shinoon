// Deprecated. OneSignal integration was removed in favour of native Web
// Push (see lib/push.ts). This file is kept only to prevent broken imports
// from any stale code paths. Re-export the new sender for back-compat.

import { sendPushToAll } from "./push";

export async function pushMissionNotification(pickup: string): Promise<void> {
  await sendPushToAll({
    title: "שינוע חדש התקבל",
    body:  `איסוף: ${pickup}`,
    url:   "/driver",
  });
}

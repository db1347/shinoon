// lib/localDb.ts
// Cloud KV store via @upstash/redis.
// Local dev: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in
// .env.local. Falls back to an in-memory store when env vars are absent.

import type {
  User,
  Mission,
  MissionStatus,
  StoredPushSubscription,
} from "./types";
import { createLogger } from "./logger";

const log = createLogger("localDb");

interface DbShape {
  users: User[];
  missions: Mission[];
  subscriptions: StoredPushSubscription[];
}

const SEED_DATA: Readonly<DbShape> = {
  users: [
    {
      id: "mgr-001",
      full_name: "רנ\"ג דוד כהן",
      role: "manager",
      phone: "050-0000001",
      status: "available",
      created_at: "2025-01-01T00:00:00.000Z",
    },
  ],
  missions: [],
  subscriptions: [],
};

function cloneSeed(): DbShape {
  return {
    users: SEED_DATA.users.map(u => ({ ...u })),
    missions: [],
    subscriptions: [],
  };
}

// ---------------------------------------------------------------------------
// In-memory fallback (used when Redis env vars are missing).
// ---------------------------------------------------------------------------

const memDb: DbShape = cloneSeed();

// ---------------------------------------------------------------------------
// Redis backend (lazy-initialised so missing env vars don't crash at import).
// ---------------------------------------------------------------------------

const hasRedis = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

const DB_KEY = "shinoon:db";

async function readDb(): Promise<DbShape> {
  if (!hasRedis) return memDb;
  const { Redis } = await import("@upstash/redis");
  const kv = Redis.fromEnv();
  const db = await kv.get<Partial<DbShape>>(DB_KEY);
  if (!db) {
    const fresh = cloneSeed();
    await kv.set(DB_KEY, fresh);
    return fresh;
  }
  // Back-compat: older rows might not have `subscriptions`.
  return {
    users: db.users ?? [],
    missions: db.missions ?? [],
    subscriptions: db.subscriptions ?? [],
  };
}

async function writeDb(db: DbShape): Promise<void> {
  if (!hasRedis) return; // memDb is mutated in-place
  const { Redis } = await import("@upstash/redis");
  const kv = Redis.fromEnv();
  await kv.set(DB_KEY, db);
}

// ---------------------------------------------------------------------------
// Users.
// ---------------------------------------------------------------------------

export async function getDrivers(): Promise<User[]> {
  const db = await readDb();
  return db.users
    .filter(u => u.role === "driver")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await readDb();
  return db.users.find(u => u.id === id) ?? null;
}

export async function updateUserStatus(
  id: string,
  status: User["status"]
): Promise<void> {
  const db = await readDb();
  const user = db.users.find(u => u.id === id);
  if (user) {
    user.status = status;
    await writeDb(db);
  }
}

// ---------------------------------------------------------------------------
// Missions.
// ---------------------------------------------------------------------------

export async function getMissions(
  filters?: { status?: MissionStatus; driver_id?: string }
): Promise<(Mission & { driver?: User | null })[]> {
  const db = await readDb();
  let list = [...db.missions];
  if (filters?.status) {
    list = list.filter(m => m.status === filters.status);
  }
  if (filters?.driver_id) {
    list = list.filter(
      m => m.assigned_driver_id === filters.driver_id ||
           (m.broadcast && m.status === "pending")
    );
  }
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return list.map(m => ({
    ...m,
    driver: m.assigned_driver_id
      ? (db.users.find(u => u.id === m.assigned_driver_id) ?? null)
      : null,
  }));
}

export async function getMissionById(id: string): Promise<Mission | null> {
  const db = await readDb();
  return db.missions.find(m => m.id === id) ?? null;
}

export async function createMission(
  data: Omit<Mission, "id" | "updated_at">
): Promise<Mission> {
  const db = await readDb();
  const mission: Mission = {
    ...data,
    id: `MSN-${Date.now().toString().slice(-6)}`,
    updated_at: data.created_at,
  };
  db.missions.push(mission);
  await writeDb(db);
  return mission;
}

export async function updateMission(
  id: string,
  patch: Partial<Mission>
): Promise<Mission | null> {
  const db = await readDb();
  const idx = db.missions.findIndex(m => m.id === id);
  if (idx === -1) return null;
  db.missions[idx] = {
    ...db.missions[idx],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  await writeDb(db);
  return db.missions[idx];
}

// ---------------------------------------------------------------------------
// Push subscriptions.
// ---------------------------------------------------------------------------

export async function getPushSubscriptions(): Promise<StoredPushSubscription[]> {
  const db = await readDb();
  return [...db.subscriptions];
}

/**
 * Insert a push subscription. If the `endpoint` already exists it is replaced
 * rather than duplicated (browsers hand us a fresh subscription on every
 * resubscribe).
 */
export async function savePushSubscription(
  sub: StoredPushSubscription
): Promise<void> {
  const db = await readDb();
  const idx = db.subscriptions.findIndex(s => s.endpoint === sub.endpoint);
  if (idx === -1) {
    db.subscriptions.push(sub);
    log.info("push subscription added", { total: db.subscriptions.length });
  } else {
    db.subscriptions[idx] = sub;
    log.debug("push subscription refreshed");
  }
  await writeDb(db);
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const db = await readDb();
  const before = db.subscriptions.length;
  db.subscriptions = db.subscriptions.filter(s => s.endpoint !== endpoint);
  if (db.subscriptions.length !== before) {
    log.info("push subscription removed", { remaining: db.subscriptions.length });
    await writeDb(db);
  }
}

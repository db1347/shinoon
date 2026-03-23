// lib/localDb.ts
// Cloud KV store via @vercel/kv.
// Local dev: run `vercel env pull .env.local` to get KV_REST_API_URL + KV_REST_API_TOKEN,
// or set them manually from your Vercel project → Storage → KV → .env.local snippet.

import { kv } from "@vercel/kv";
import type { User, Mission, MissionStatus } from "./types";

const DB_KEY = "shinoon:db";

interface DbShape { users: User[]; missions: Mission[]; }

const SEED_DATA: DbShape = {
  users: [
    { id: "mgr-001", full_name: "רנ\"ג דוד כהן",        role: "manager", phone: "050-0000001", status: "available", created_at: "2025-01-01T00:00:00.000Z" },
    { id: "d-001",   full_name: "רב\"ט יעקב לוי",        role: "driver",  phone: "050-0000101", status: "available", created_at: "2025-01-01T00:00:00.000Z" },
    { id: "d-002",   full_name: "סמל שרה כהן",           role: "driver",  phone: "050-0000102", status: "available", created_at: "2025-01-01T00:00:00.000Z" },
    { id: "d-003",   full_name: "טוראי דוד מזרחי",       role: "driver",  phone: "050-0000103", status: "available", created_at: "2025-01-01T00:00:00.000Z" },
    { id: "d-004",   full_name: "רב\"ט נועה ברקת",       role: "driver",  phone: "050-0000104", status: "available", created_at: "2025-01-01T00:00:00.000Z" },
    { id: "d-005",   full_name: "סמל ראשון אמיר גל",     role: "driver",  phone: "050-0000105", status: "offline",   created_at: "2025-01-01T00:00:00.000Z" },
    { id: "d-006",   full_name: "טוראי מיכל אדרי",       role: "driver",  phone: "050-0000106", status: "available", created_at: "2025-01-01T00:00:00.000Z" },
  ],
  missions: [],
};

async function readDb(): Promise<DbShape> {
  const db = await kv.get<DbShape>(DB_KEY);
  if (!db) {
    await kv.set(DB_KEY, SEED_DATA);
    return SEED_DATA;
  }
  return db;
}

async function writeDb(db: DbShape): Promise<void> {
  await kv.set(DB_KEY, db);
}

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

export async function updateUserStatus(id: string, status: User["status"]): Promise<void> {
  const db = await readDb();
  const user = db.users.find(u => u.id === id);
  if (user) {
    user.status = status;
    await writeDb(db);
  }
}

export async function getMissions(
  filters?: { status?: MissionStatus; driver_id?: string }
): Promise<(Mission & { driver?: User | null })[]> {
  const db = await readDb();
  let list = [...db.missions];
  if (filters?.status)    list = list.filter(m => m.status === filters.status);
  if (filters?.driver_id) list = list.filter(
    m => m.assigned_driver_id === filters.driver_id || (m.broadcast && m.status === "pending")
  );
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return list.map(m => ({
    ...m,
    driver: m.assigned_driver_id ? (db.users.find(u => u.id === m.assigned_driver_id) ?? null) : null,
  }));
}

export async function getMissionById(id: string): Promise<Mission | null> {
  const db = await readDb();
  return db.missions.find(m => m.id === id) ?? null;
}

export async function createMission(data: Omit<Mission, "id" | "updated_at">): Promise<Mission> {
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

export async function updateMission(id: string, patch: Partial<Mission>): Promise<Mission | null> {
  const db = await readDb();
  const idx = db.missions.findIndex(m => m.id === id);
  if (idx === -1) return null;
  db.missions[idx] = { ...db.missions[idx], ...patch, updated_at: new Date().toISOString() };
  await writeDb(db);
  return db.missions[idx];
}

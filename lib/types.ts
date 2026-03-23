// lib/types.ts

export type UserRole = "manager" | "driver";
export type UserStatus = "available" | "on_mission" | "offline";
export type MissionPriority = "low" | "normal" | "high" | "urgent";
export type MissionStatus = "pending" | "accepted" | "en_route" | "completed" | "cancelled";

// Driver can now mark directly as completed (no accept/en_route steps)
export const DRIVER_STATUS_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  pending:   ["completed"],
  accepted:  ["completed"],
  en_route:  ["completed"],
  completed: [],
  cancelled: [],
};

export const MANAGER_STATUS_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  pending:   ["accepted", "cancelled"],
  accepted:  ["en_route", "cancelled"],
  en_route:  ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export interface User {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  status: UserStatus;
  created_at: string;
}

export interface Mission {
  id: string;
  pickup_location: string;
  destination: string;
  passengers: number;
  priority: MissionPriority;
  status: MissionStatus;
  broadcast: boolean;
  assigned_driver_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

export interface MissionWithDriver extends Mission {
  driver: Pick<User, "id" | "full_name" | "phone" | "status"> | null;
}

export interface CreateMissionBody {
  pickup_location: string;
  destination: string;
  passengers: number;
  priority?: MissionPriority;
  assigned_driver_id?: string;
  broadcast?: boolean;
  created_by: string;
}

export interface UpdateMissionStatusBody {
  status: MissionStatus;
  driver_id?: string;
  caller_role?: "manager" | "driver";
}

export interface ApiSuccess<T> { data: T; error: null; }
export interface ApiError { data: null; error: string; }
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

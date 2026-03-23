"use client";

import React, { useState, useEffect, useCallback, useReducer, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MissionStatus = "pending" | "accepted" | "en_route" | "completed" | "cancelled";
type Priority = "low" | "normal" | "high" | "urgent";

interface Mission {
  id: string; pickup_location: string; destination: string; passengers: number;
  priority: Priority; status: MissionStatus; assigned_driver_id?: string; broadcast: boolean;
  created_by: string; created_at: string; updated_at: string;
  accepted_at?: string; completed_at?: string;
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

interface Th {
  dark: boolean;
  app: string; header: string; panel: string; card: string;
  text: string; textSub: string; textFaint: string;
  border: string; borderMd: string; input: string; skeleton: string;
  emptyText: string; toggleBtn: string; divider: string;
}

function getTheme(dark: boolean): Th {
  return dark ? {
    dark, app: "bg-slate-950", header: "bg-slate-900 border-slate-800",
    panel: "bg-slate-900/50 border-slate-800", card: "bg-slate-900 border-slate-700",
    text: "text-slate-100", textSub: "text-slate-400", textFaint: "text-slate-600",
    border: "border-slate-800", borderMd: "border-slate-700",
    input: "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-600 focus:ring-cyan-600/40",
    skeleton: "bg-slate-800", emptyText: "text-slate-600",
    toggleBtn: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700",
    divider: "bg-slate-700",
  } : {
    dark, app: "bg-slate-50", header: "bg-white border-slate-200",
    panel: "bg-white border-slate-200", card: "bg-white border-slate-200",
    text: "text-slate-900", textSub: "text-slate-500", textFaint: "text-slate-400",
    border: "border-slate-200", borderMd: "border-slate-300",
    input: "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-cyan-600/30",
    skeleton: "bg-slate-200", emptyText: "text-slate-400",
    toggleBtn: "bg-white border-slate-300 text-slate-600 hover:bg-slate-100",
    divider: "bg-slate-300",
  };
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const fetchMissions = async (): Promise<Mission[]> => {
  try {
    const res = await fetch("/api/missions");
    if (!res.ok) throw new Error();
    const json = await res.json();
    return json.data ?? json;
  } catch { return []; }
};

const postMission = async (payload: Partial<Mission>): Promise<Mission> => {
  const res = await fetch("/api/missions", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error();
  const json = await res.json();
  return json.data ?? json;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatElapsed = (iso: string): string => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}ש`;
  if (d < 3600) return `${Math.floor(d / 60)}ד`;
  return `${Math.floor(d / 3600)}ש ${Math.floor((d % 3600) / 60)}ד`;
};

const formatTime = (iso?: string): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
};

const STATUS_STYLES: Record<MissionStatus, { badge: string; dot: string; label: string }> = {
  pending:   { badge: "bg-slate-700 text-slate-300 border-slate-600",    dot: "bg-slate-400",  label: "ממתין" },
  accepted:  { badge: "bg-blue-900/60 text-blue-300 border-blue-700",    dot: "bg-blue-400",   label: "התקבל" },
  en_route:  { badge: "bg-amber-900/60 text-amber-300 border-amber-700", dot: "bg-amber-400",  label: "בדרך"  },
  completed: { badge: "bg-green-900/60 text-green-300 border-green-700", dot: "bg-green-400",  label: "הושלם" },
  cancelled: { badge: "bg-red-900/60 text-red-400 border-red-800",       dot: "bg-red-500",    label: "בוטל"  },
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useLiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
  return time;
}

type MissionAction = { type: "SET"; payload: Mission[] } | { type: "ADD"; payload: Mission }
  | { type: "UPDATE"; payload: Mission } | { type: "REMOVE"; payload: string };

function missionReducer(state: Mission[], action: MissionAction): Mission[] {
  switch (action.type) {
    case "SET":    return action.payload;
    case "ADD":    return [action.payload, ...state];
    case "UPDATE": return state.map(m => m.id === action.payload.id ? action.payload : m);
    case "REMOVE": return state.filter(m => m.id !== action.payload);
    default:       return state;
  }
}

function useActiveMissions() {
  const [missions, dispatch] = useReducer(missionReducer, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    try {
      dispatch({ type: "SET", payload: await fetchMissions() });
      setLastRefresh(new Date()); setError(null);
    } catch { setError("שגיאה בטעינת שינועים"); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [load]);

  const addMission    = useCallback((m: Mission) => dispatch({ type: "ADD", payload: m }), []);
  const cancelMission = useCallback(async (id: string, ms: Mission[]) => {
    const m = ms.find(m => m.id === id);
    if (!m) return;
    dispatch({ type: "UPDATE", payload: { ...m, status: "cancelled" } });
    try {
      await fetch(`/api/missions/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", caller_role: "manager" }),
      });
    } catch { /* next poll restores */ }
  }, []);

  return { missions, loading, error, lastRefresh, addMission, cancelMission };
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function MapPinIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function FlagIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
}
function UserIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function SunIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
}
function MoonIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
}
function PlusIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: MissionStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wide ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}

function Spinner() {
  return <span className="inline-block w-3.5 h-3.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />;
}

// ---------------------------------------------------------------------------
// Dispatch Form
// ---------------------------------------------------------------------------

const EMPTY_FORM = { pickup_location: "", destination: "", passengers: 1 };

function DispatchForm({ onMissionCreated, t }: {
  onMissionCreated: (m: Mission) => void; t: Th;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successFlash, setSuccessFlash] = useState(false);
  const pickupRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pickup_location.trim() || !form.destination.trim()) return;
    setSubmitting(true); setSubmitError(null);

    const payload = {
      pickup_location: form.pickup_location.trim(),
      destination: form.destination.trim(),
      passengers: form.passengers,
      priority: "normal" as Priority,
      assigned_driver_id: undefined,
      broadcast: true,
      status: "pending" as const,
      created_by: "mgr-001",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const created = await postMission(payload);
      onMissionCreated(created as Mission);
      setForm(EMPTY_FORM);
      setSuccessFlash(true);
      setTimeout(() => setSuccessFlash(false), 2000);
      pickupRef.current?.focus();
    } catch { setSubmitError("הפצה נכשלה. נסה שוב."); }
    finally { setSubmitting(false); }
  };

  const fc = `w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-colors ${t.input}`;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full" dir="rtl">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-mono font-bold text-cyan-500 tracking-wide">שינוע חדש</span>
        <div className={`flex-1 h-px ${t.divider}`} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={`text-[10px] font-mono tracking-wide ${t.textSub}`}>נקודת איסוף</label>
        <input ref={pickupRef} type="text" value={form.pickup_location}
          onChange={e => setForm(f => ({ ...f, pickup_location: e.target.value }))}
          placeholder="לדוגמה: בסיס אלפא, שער מזרח" className={fc} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={`text-[10px] font-mono tracking-wide ${t.textSub}`}>יעד</label>
        <input type="text" value={form.destination}
          onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
          placeholder="לדוגמה: מחסן מרכזי מגזר 4" className={fc} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={`text-[10px] font-mono tracking-wide ${t.textSub}`}>מספר נוסעים</label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setForm(f => ({ ...f, passengers: Math.max(1, f.passengers - 1) }))}
            className={`w-10 h-10 rounded border text-lg font-bold flex-shrink-0 transition-all ${t.dark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}>
            −
          </button>
          <input type="number" min={1} max={99} value={form.passengers}
            onChange={e => setForm(f => ({ ...f, passengers: Math.max(1, parseInt(e.target.value) || 1) }))}
            className={`${fc} text-center text-xl font-black w-full`} />
          <button type="button" onClick={() => setForm(f => ({ ...f, passengers: Math.min(99, f.passengers + 1) }))}
            className={`w-10 h-10 rounded border text-lg font-bold flex-shrink-0 transition-all ${t.dark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}>
            +
          </button>
        </div>
      </div>

      {submitError && <p className="text-red-400 text-xs font-mono bg-red-900/20 border border-red-800 rounded px-3 py-2">{submitError}</p>}

      <button type="submit" disabled={submitting}
        className={`mt-auto w-full py-3 rounded font-mono font-bold text-sm tracking-wide border transition-all
          ${successFlash ? "bg-green-700 border-green-500 text-green-100"
          : submitting   ? "bg-cyan-900/40 border-cyan-800 text-cyan-500 cursor-wait"
          : "bg-cyan-700 border-cyan-500 text-white hover:bg-cyan-600 active:scale-[0.99]"}`}>
        {successFlash ? <span className="flex items-center justify-center gap-2">✓ שינוע נפרס</span>
        : submitting   ? <span className="flex items-center justify-center gap-2"><Spinner /> פורס...</span>
        : "פרוס שינוע"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Manager Mission Card
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES: MissionStatus[] = ["pending", "accepted", "en_route"];

function ManagerMissionCard({ mission, onCancel, t }: {
  mission: Mission; onCancel: (id: string) => void; t: Th;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 30000); return () => clearInterval(id); }, []);

  const handleCancel = () => {
    if (confirmCancel) { onCancel(mission.id); setConfirmCancel(false); }
    else { setConfirmCancel(true); setTimeout(() => setConfirmCancel(false), 3000); }
  };

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm ${t.card}`}>
      <div className="px-5 pt-5 pb-4 flex flex-col gap-4">
        {/* Pickup */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 text-emerald-500">
            <MapPinIcon />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-semibold mb-0.5 ${t.textSub}`}>איסוף</p>
            <p className={`text-base font-bold leading-snug ${t.text}`}>{mission.pickup_location}</p>
          </div>
        </div>

        <div className={`h-px mx-8 ${t.dark ? "bg-slate-800" : "bg-slate-200"}`} />

        {/* Destination */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 text-blue-500">
            <FlagIcon />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-semibold mb-0.5 ${t.textSub}`}>יעד</p>
            <p className={`text-base font-bold leading-snug ${t.text}`}>{mission.destination}</p>
          </div>
        </div>

        {/* Passengers + meta */}
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${t.dark ? "bg-slate-800/60" : "bg-slate-100"}`}>
          <div className={t.textSub}><UserIcon /></div>
          <p className={`text-xs font-semibold ${t.textSub}`}>נוסעים</p>
          <p className={`text-2xl font-black mr-auto ${t.text}`}>{mission.passengers}</p>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={mission.status} />
            <span className={`text-[10px] font-mono ${t.textFaint}`}>{formatElapsed(mission.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Cancel button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleCancel}
          className={`w-full min-h-[52px] rounded-xl font-bold text-base transition-all duration-150 border active:scale-[0.98]
            ${confirmCancel
              ? "bg-red-700 border-red-500 text-white"
              : t.dark
                ? "bg-transparent border-slate-700 text-slate-400 hover:border-red-700 hover:text-red-400"
                : "bg-transparent border-slate-300 text-slate-500 hover:border-red-400 hover:text-red-500"
            }`}
        >
          {confirmCancel ? "לאשר ביטול?" : "ביטול שינוע"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active Mission Cards
// ---------------------------------------------------------------------------

function ActiveMissionCards({ missions, loading, lastRefresh, onCancel, onAddMission, t }: {
  missions: Mission[]; loading: boolean; lastRefresh: Date;
  onCancel: (id: string) => void; onAddMission: () => void; t: Th;
}) {
  const active = missions
    .filter(m => ACTIVE_STATUSES.includes(m.status))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-bold text-cyan-500 tracking-wide`}>שינועים פעילים</span>
          <span className="bg-cyan-900/50 text-cyan-400 border border-cyan-800 text-[10px] font-mono rounded px-1.5 py-0.5">{active.length}</span>
          <div className={`flex items-center gap-1.5 text-[10px] font-mono ${t.textFaint}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            חי
          </div>
        </div>
        {/* Add button — always visible, especially useful on mobile */}
        <button
          onClick={onAddMission}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 active:scale-[0.97] text-white text-sm font-bold transition-all shadow-md shadow-cyan-900/30"
        >
          <PlusIcon />
          הוסף שינוע
        </button>
      </div>

      {/* Cards / States */}
      {loading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className={`rounded-2xl border h-48 animate-pulse ${t.card}`} />
        ))
      ) : active.length === 0 ? (
        <div className={`rounded-2xl border flex flex-col items-center justify-center py-16 gap-4 ${t.card}`}>
          <span className={`text-4xl ${t.emptyText}`}>◼</span>
          <p className={`font-mono text-sm tracking-wide ${t.emptyText}`}>אין שינועים פעילים</p>
          <button
            onClick={onAddMission}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 active:scale-[0.97] text-white text-sm font-bold transition-all"
          >
            <PlusIcon />
            פרוס שינוע ראשון
          </button>
        </div>
      ) : (
        active.map(m => (
          <ManagerMissionCard key={m.id} mission={m} onCancel={onCancel} t={t} />
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent Trips
// ---------------------------------------------------------------------------

function RecentTripsTable({ missions, loading, t }: { missions: Mission[]; loading: boolean; t: Th }) {
  const recent = missions
    .filter(m => m.status === "completed" || m.status === "cancelled")
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10);

  const getDuration = (m: Mission) => {
    if (!m.accepted_at || !m.completed_at) return "—";
    const mins = Math.floor((new Date(m.completed_at).getTime() - new Date(m.accepted_at).getTime()) / 60000);
    return mins < 60 ? `${mins}ד` : `${Math.floor(mins/60)}ש ${mins%60}ד`;
  };

  const th = `px-3 py-2 text-right text-[10px] font-mono font-bold tracking-wide whitespace-nowrap ${t.textFaint}`;

  return (
    <div dir="rtl">
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[10px] font-mono font-bold tracking-wide ${t.textSub}`}>נסיעות אחרונות</span>
        <div className={`flex-1 h-px ${t.divider}`} />
        <span className={`text-[10px] font-mono ${t.textFaint}`}>10 אחרונות</span>
      </div>
      <div className={`overflow-x-auto rounded border ${t.border}`}>
        <table className="w-full text-sm border-collapse">
          <thead className={`border-b ${t.dark ? "bg-slate-900/80 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
            <tr>
              <th className={th}>מסלול</th>
              <th className={th}>נוסעים</th>
              <th className={th}>סטטוס</th>
              <th className={th}>הושלם</th>
              <th className={th}>משך</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className={`border-b ${t.border}`}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <td key={j} className="px-3 py-2.5"><div className={`h-2.5 rounded animate-pulse ${t.skeleton}`} /></td>
                ))}
              </tr>
            )) : recent.length === 0 ? (
              <tr><td colSpan={5} className={`px-6 py-8 text-center text-xs font-mono tracking-wide ${t.emptyText}`}>אין נסיעות שהושלמו עדיין</td></tr>
            ) : recent.map(m => (
              <tr key={m.id} className={`border-b ${t.border} ${t.dark ? "hover:bg-slate-800/30" : "hover:bg-slate-50"} transition-colors`}>
                <td className="px-3 py-2.5 max-w-[220px]">
                  <span className={`text-[10px] truncate block ${t.textSub}`}>{m.pickup_location} ← {m.destination}</span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`font-mono font-bold text-sm ${t.text}`}>{m.passengers}</span>
                </td>
                <td className="px-3 py-2.5"><StatusBadge status={m.status} /></td>
                <td className="px-3 py-2.5"><span className={`font-mono text-[11px] ${t.textFaint}`}>{formatTime(m.completed_at ?? m.updated_at)}</span></td>
                <td className="px-3 py-2.5"><span className={`font-mono text-[11px] ${t.textFaint}`}>{getDuration(m)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header({ activeMissionCount, t, onToggle }: { activeMissionCount: number; t: Th; onToggle: () => void }) {
  const time = useLiveClock();
  const timeStr = time.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = time.toLocaleDateString("he-IL", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

  return (
    <header className={`flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0 gap-2 ${t.header}`} dir="rtl">
      <div className="flex items-center gap-2 min-w-0">
        <div className="grid grid-cols-3 gap-0.5 w-4 h-4 opacity-60 flex-shrink-0">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="bg-cyan-400 rounded-sm" />)}
        </div>
        <h1 className={`font-mono font-bold tracking-wide text-sm md:text-base truncate ${t.text}`}>מפקדת שינועים</h1>
        <span className={`font-mono text-[10px] tracking-wide hidden md:inline ${t.textFaint}`}>שליטה מבצעית</span>
      </div>
      <div className={`flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded border flex-shrink-0 ${t.dark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className={`font-mono text-[11px] tracking-wide ${t.text}`}>{activeMissionCount} פעיל</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden sm:flex flex-col items-start">
          <span className="font-mono text-sm md:text-lg font-bold text-cyan-400 tracking-wider leading-none">{timeStr}</span>
          <span className={`font-mono text-[10px] tracking-wide mt-0.5 hidden md:block ${t.textFaint}`}>{dateStr}</span>
        </div>
        <button onClick={onToggle} className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded border text-xs font-mono transition-all ${t.toggleBtn}`}>
          {t.dark ? <SunIcon /> : <MoonIcon />}
          <span className="hidden md:inline">{t.dark ? "בהיר" : "כהה"}</span>
        </button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function ManagerDashboard() {
  const [dark, setDark] = useState(true);
  const t = getTheme(dark);
  const { missions, loading, error, lastRefresh, addMission, cancelMission } = useActiveMissions();
  const activeMissionCount = missions.filter(m => (["pending","accepted","en_route"] as MissionStatus[]).includes(m.status)).length;
  const handleCancel = useCallback((id: string) => cancelMission(id, missions), [cancelMission, missions]);
  const [mobileTab, setMobileTab] = useState<"missions" | "dispatch">("missions");

  const errorBanner = error && (
    <div className="flex-shrink-0 px-4 md:px-6 py-2 bg-red-900/30 border-b border-red-800 text-red-300 text-xs font-mono tracking-wide">
      {error} — מציג נתונים שמורים
    </div>
  );

  const missionCards = (
    <ActiveMissionCards
      missions={missions}
      loading={loading}
      lastRefresh={lastRefresh}
      onCancel={handleCancel}
      onAddMission={() => setMobileTab("dispatch")}
      t={t}
    />
  );

  const dispatchForm = (
    <DispatchForm onMissionCreated={(m) => { addMission(m); setMobileTab("missions"); }} t={t} />
  );

  const recentTripsTable = (
    <RecentTripsTable missions={missions} loading={loading} t={t} />
  );

  return (
    <div className={`flex flex-col h-dvh w-full overflow-hidden transition-colors duration-200 ${t.app} ${t.text}`} dir="rtl">
      <Header activeMissionCount={activeMissionCount} t={t} onToggle={() => setDark(d => !d)} />
      {errorBanner}

      {/* ── Mobile layout (< md) ── */}
      <div className="flex flex-col flex-1 overflow-hidden md:hidden">
        <div className={`flex-1 overflow-y-auto ${mobileTab === "dispatch" ? "block" : "hidden"}`}>
          <div className="px-4 py-5">
            {dispatchForm}
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto ${mobileTab === "missions" ? "block" : "hidden"}`}>
          <div className="px-4 py-5 flex flex-col gap-6">
            {missionCards}
            <div className={`h-px ${t.dark ? "bg-slate-800" : "bg-slate-200"}`} />
            {recentTripsTable}
          </div>
        </div>
        {/* Mobile tab bar */}
        <div className={`flex-shrink-0 flex border-t ${t.border} ${t.dark ? "bg-slate-900/50" : "bg-white"}`}>
          <button
            onClick={() => setMobileTab("missions")}
            className={`flex-1 py-3 text-xs font-mono font-bold tracking-wide transition-all
              ${mobileTab === "missions" ? "text-cyan-400 border-t-2 border-cyan-500 -mt-px" : t.textFaint}`}
          >
            שינועים
          </button>
          <button
            onClick={() => setMobileTab("dispatch")}
            className={`flex-1 py-3 text-xs font-mono font-bold tracking-wide transition-all
              ${mobileTab === "dispatch" ? "text-cyan-400 border-t-2 border-cyan-500 -mt-px" : t.textFaint}`}
          >
            פרוס שינוע
          </button>
        </div>
      </div>

      {/* ── Desktop layout (≥ md) ── */}
      <div className="hidden md:flex flex-1 overflow-hidden flex-row-reverse">
        <aside className={`w-[30%] min-w-[280px] max-w-[380px] border-l flex flex-col overflow-y-auto px-5 py-5 ${t.panel}`}>
          {dispatchForm}
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-5 min-h-0">
            {missionCards}
          </div>
          <div className={`h-px flex-shrink-0 ${t.dark ? "bg-slate-800" : "bg-slate-200"}`} />
          <div className={`h-[260px] flex-shrink-0 overflow-y-auto px-5 py-4 ${t.dark ? "bg-slate-950/60" : "bg-slate-50"}`}>
            {recentTripsTable}
          </div>
        </main>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useReducer, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MissionStatus = "pending" | "accepted" | "en_route" | "completed" | "cancelled";
type Priority = "low" | "normal" | "high" | "urgent";
type DriverStatus = "available" | "on_mission" | "offline";

interface Driver { id: string; full_name: string; role: "manager" | "driver"; phone: string; status: DriverStatus; }
interface Mission {
  id: string; pickup_location: string; destination: string; passengers: number;
  priority: Priority; status: MissionStatus; assigned_driver_id?: string; broadcast: boolean;
  created_by: string; created_at: string; updated_at: string;
  accepted_at?: string; completed_at?: string; driver?: Driver;
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

interface Th {
  dark: boolean;
  app: string; header: string; panel: string; card: string; tableHdr: string;
  rowHover: string; text: string; textSub: string; textFaint: string;
  border: string; borderMd: string; input: string; skeleton: string;
  emptyText: string; toggleBtn: string; divider: string;
}

function getTheme(dark: boolean): Th {
  return dark ? {
    dark, app: "bg-slate-950", header: "bg-slate-900 border-slate-800",
    panel: "bg-slate-900/50 border-slate-800", card: "bg-slate-900 border-slate-800",
    tableHdr: "bg-slate-900/80 border-slate-800", rowHover: "hover:bg-slate-800/30",
    text: "text-slate-100", textSub: "text-slate-400", textFaint: "text-slate-600",
    border: "border-slate-800", borderMd: "border-slate-700",
    input: "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-600 focus:ring-cyan-600/40",
    skeleton: "bg-slate-800", emptyText: "text-slate-600",
    toggleBtn: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700",
    divider: "bg-slate-700",
  } : {
    dark, app: "bg-slate-50", header: "bg-white border-slate-200",
    panel: "bg-white border-slate-200", card: "bg-white border-slate-200",
    tableHdr: "bg-slate-100 border-slate-200", rowHover: "hover:bg-slate-50",
    text: "text-slate-900", textSub: "text-slate-500", textFaint: "text-slate-400",
    border: "border-slate-200", borderMd: "border-slate-300",
    input: "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-cyan-600/30",
    skeleton: "bg-slate-200", emptyText: "text-slate-400",
    toggleBtn: "bg-white border-slate-300 text-slate-600 hover:bg-slate-100",
    divider: "bg-slate-300",
  };
}

// ---------------------------------------------------------------------------
// Mock data (fallback when API is unavailable)
// ---------------------------------------------------------------------------

const MOCK_DRIVERS: Driver[] = [
  { id: "d-001", full_name: "רב\"ט יעקב לוי",    role: "driver", phone: "050-0000101", status: "available"  },
  { id: "d-002", full_name: "סמל שרה כהן",       role: "driver", phone: "050-0000102", status: "available"  },
  { id: "d-003", full_name: "טוראי דוד מזרחי",   role: "driver", phone: "050-0000103", status: "on_mission" },
  { id: "d-004", full_name: "רב\"ט נועה ברקת",   role: "driver", phone: "050-0000104", status: "available"  },
  { id: "d-005", full_name: "סמל אמיר גל",       role: "driver", phone: "050-0000105", status: "offline"    },
  { id: "d-006", full_name: "טוראי מיכל אדרי",   role: "driver", phone: "050-0000106", status: "on_mission" },
];

const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

const MOCK_MISSIONS: Mission[] = [
  { id: "MSN-7841", pickup_location: "בסיס אלפא, שער מזרח", destination: "מחסן מגזר 4", passengers: 8,
    priority: "urgent", status: "en_route", assigned_driver_id: "d-003", broadcast: false,
    created_by: "mgr-001", created_at: minsAgo(42), updated_at: minsAgo(38), accepted_at: minsAgo(40), driver: MOCK_DRIVERS[2] },
  { id: "MSN-7842", pickup_location: "עמדת ברבו, מפרץ 3", destination: "בית חולים שדה 7", passengers: 3,
    priority: "high", status: "accepted", assigned_driver_id: "d-006", broadcast: false,
    created_by: "mgr-001", created_at: minsAgo(18), updated_at: minsAgo(15), accepted_at: minsAgo(15), driver: MOCK_DRIVERS[5] },
  { id: "MSN-7843", pickup_location: "מחסן רכש ראשי", destination: "עמדת תצפית צ'ארלי", passengers: 12,
    priority: "normal", status: "pending", broadcast: true,
    created_by: "mgr-001", created_at: minsAgo(5), updated_at: minsAgo(5) },
  { id: "MSN-7844", pickup_location: "מבנה מודיעין, קומה 2", destination: "בונקר פיקוד", passengers: 2,
    priority: "low", status: "pending", assigned_driver_id: "d-001", broadcast: false,
    created_by: "mgr-001", created_at: minsAgo(2), updated_at: minsAgo(2), driver: MOCK_DRIVERS[0] },
  { id: "MSN-7839", pickup_location: "מחסן דלק ברבו", destination: "קו קדמי דלתא", passengers: 6,
    priority: "high", status: "completed", assigned_driver_id: "d-002", broadcast: false,
    created_by: "mgr-001", created_at: minsAgo(120), updated_at: minsAgo(60),
    accepted_at: minsAgo(118), completed_at: minsAgo(60), driver: MOCK_DRIVERS[1] },
  { id: "MSN-7838", pickup_location: "חמש\"ן, שער ג'", destination: "מחלקת אקו, אימונים 5", passengers: 4,
    priority: "normal", status: "completed", assigned_driver_id: "d-004", broadcast: false,
    created_by: "mgr-001", created_at: minsAgo(200), updated_at: minsAgo(130),
    accepted_at: minsAgo(198), completed_at: minsAgo(130), driver: MOCK_DRIVERS[3] },
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const fetchMissions = async (): Promise<Mission[]> => {
  try {
    const res = await fetch("/api/missions");
    if (!res.ok) throw new Error();
    const json = await res.json();
    return json.data ?? json;
  } catch { return MOCK_MISSIONS; }
};

const fetchDrivers = async (): Promise<Driver[]> => {
  try {
    const res = await fetch("/api/drivers");
    if (!res.ok) throw new Error();
    const json = await res.json();
    return json.data ?? json;
  } catch { return MOCK_DRIVERS; }
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

const initials = (name: string): string =>
  name.split(" ").filter(w => w.match(/^[\u05D0-\u05EAA-Za-z"]/)).slice(-2).map(w => w[0]).join("");

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const PRIORITY_STYLES: Record<Priority, { badge: string; label: string; button: string; buttonActive: string }> = {
  low:    { badge: "bg-slate-700 text-slate-300 border-slate-600",            label: "נמוכה", button: "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200",     buttonActive: "bg-slate-600 border-slate-500 text-slate-100"    },
  normal: { badge: "bg-blue-900/60 text-blue-300 border-blue-700",            label: "רגילה", button: "border-blue-700 text-blue-400 hover:border-blue-500 hover:text-blue-200",         buttonActive: "bg-blue-800 border-blue-600 text-blue-100"       },
  high:   { badge: "bg-orange-900/60 text-orange-300 border-orange-700",      label: "גבוהה", button: "border-orange-700 text-orange-400 hover:border-orange-500 hover:text-orange-200", buttonActive: "bg-orange-800 border-orange-600 text-orange-100" },
  urgent: { badge: "bg-red-900/70 text-red-300 border-red-700 animate-pulse", label: "דחוף",  button: "border-red-700 text-red-400 hover:border-red-500 hover:text-red-200",             buttonActive: "bg-red-800 border-red-600 text-red-100"          },
};

const STATUS_STYLES: Record<MissionStatus, { badge: string; dot: string; label: string }> = {
  pending:   { badge: "bg-slate-700 text-slate-300 border-slate-600",       dot: "bg-slate-400",  label: "ממתין"  },
  accepted:  { badge: "bg-blue-900/60 text-blue-300 border-blue-700",       dot: "bg-blue-400",   label: "התקבל"  },
  en_route:  { badge: "bg-amber-900/60 text-amber-300 border-amber-700",    dot: "bg-amber-400",  label: "בדרך"   },
  completed: { badge: "bg-green-900/60 text-green-300 border-green-700",    dot: "bg-green-400",  label: "הושלם"  },
  cancelled: { badge: "bg-red-900/60 text-red-400 border-red-800",          dot: "bg-red-500",    label: "בוטל"   },
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
    // Optimistic update
    dispatch({ type: "UPDATE", payload: { ...m, status: "cancelled" } });
    try {
      await fetch(`/api/missions/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", caller_role: "manager" }),
      });
    } catch {
      // Revert on failure — next poll will restore correct state
    }
  }, []);

  return { missions, loading, error, lastRefresh, addMission, cancelMission };
}

function useDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchDrivers().then(d => { setDrivers(d); setLoading(false); }); }, []);
  return { drivers, loading };
}

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------

function PriorityBadge({ priority }: { priority: Priority }) {
  const s = PRIORITY_STYLES[priority];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wide ${s.badge}`}>{s.label}</span>;
}

function StatusBadge({ status }: { status: MissionStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wide ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}

function DriverAvatar({ name, t }: { name: string; t: Th }) {
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-[10px] font-mono font-bold flex-shrink-0 ${t.dark ? "bg-slate-700 border-slate-500 text-slate-200" : "bg-slate-200 border-slate-300 text-slate-700"}`}>
      {initials(name)}
    </span>
  );
}

function Spinner() {
  return <span className="inline-block w-3.5 h-3.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />;
}

function SunIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
}
function MoonIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
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
      let created: Mission;
      try { created = await postMission(payload); }
      catch {
        created = { ...payload, id: `MSN-${7800 + Math.floor(Math.random() * 100)}`, broadcast: true,
          accepted_at: undefined, completed_at: undefined };
      }
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
// Active Missions Table
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES: MissionStatus[] = ["pending", "accepted", "en_route"];
const STATUS_FILTERS = [
  { label: "הכל פעיל", value: "all"      },
  { label: "ממתין",    value: "pending"  },
  { label: "התקבל",   value: "accepted" },
  { label: "בדרך",    value: "en_route" },
] as const;

type SortKey = "id" | "pickup_location" | "status" | "created_at" | "passengers";
const PRIORITY_ORDER: Record<Priority, number>      = { urgent: 0, high: 1, normal: 2, low: 3 };
const STATUS_ORDER:   Record<MissionStatus, number> = { en_route: 0, accepted: 1, pending: 2, completed: 3, cancelled: 4 };

function ActiveMissionsTable({ missions, loading, lastRefresh, onCancel, t }: {
  missions: Mission[]; loading: boolean; lastRefresh: Date; onCancel: (id: string) => void; t: Th;
}) {
  const [statusFilter, setStatusFilter] = useState<MissionStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 10000); return () => clearInterval(id); }, []);

  const active   = missions.filter(m => ACTIVE_STATUSES.includes(m.status));
  const filtered = active.filter(m => statusFilter === "all" || m.status === statusFilter);
  const sorted   = [...filtered].sort((a, b) => {
    let cmp = 0;
    if      (sortKey === "id")              cmp = a.id.localeCompare(b.id);
    else if (sortKey === "pickup_location") cmp = a.pickup_location.localeCompare(b.pickup_location);
    else if (sortKey === "passengers")      cmp = a.passengers - b.passengers;
    else if (sortKey === "status")          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    else if (sortKey === "created_at")      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const handleCancelClick = (id: string) => {
    if (cancelConfirm === id) { onCancel(id); setCancelConfirm(null); }
    else { setCancelConfirm(id); setTimeout(() => setCancelConfirm(c => c === id ? null : c), 3000); }
  };

  const SI = ({ k }: { k: SortKey }) =>
    sortKey === k ? <span className="mr-1 text-cyan-400">{sortDir === "asc" ? "↑" : "↓"}</span>
                 : <span className={`mr-1 ${t.textFaint}`}>↕</span>;

  const th = `px-3 py-2.5 text-right text-[10px] font-mono font-bold tracking-wide whitespace-nowrap cursor-pointer select-none ${t.textSub}`;

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-cyan-500 tracking-wide">שינועים פעילים</span>
          <span className="bg-cyan-900/50 text-cyan-400 border border-cyan-800 text-[10px] font-mono rounded px-1.5 py-0.5">{active.length}</span>
        </div>
        <div className={`flex items-center gap-2 text-[10px] font-mono ${t.textFaint}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
          חי — עודכן לפני {formatElapsed(lastRefresh.toISOString())}
        </div>
      </div>

      <div className="flex gap-1 mb-3">
        {STATUS_FILTERS.map(opt => (
          <button key={opt.value} onClick={() => setStatusFilter(opt.value as MissionStatus | "all")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wide border transition-all
              ${statusFilter === opt.value ? (t.dark ? "bg-slate-700 border-slate-500 text-slate-100" : "bg-slate-200 border-slate-400 text-slate-800") : `${t.border} ${t.textFaint}`}`}>
            {opt.label}
            {opt.value !== "all" && <span className={`mr-1.5 ${t.textFaint}`}>{active.filter(m => m.status === opt.value).length}</span>}
          </button>
        ))}
      </div>

      <div className={`overflow-x-auto rounded border ${t.border}`}>
        <table className="w-full text-sm border-collapse">
          <thead className={`border-b ${t.tableHdr}`}>
            <tr>
              <th className={th} onClick={() => handleSort("pickup_location")}>מסלול <SI k="pickup_location" /></th>
              <th className={th} onClick={() => handleSort("passengers")}>נוסעים <SI k="passengers" /></th>
              <th className={th} onClick={() => handleSort("status")}>סטטוס <SI k="status" /></th>
              <th className={th} onClick={() => handleSort("created_at")}>שחלף <SI k="created_at" /></th>
              <th className={`${th} text-left`}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className={`border-b ${t.border}`}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <td key={j} className="px-3 py-3"><div className={`h-3 rounded animate-pulse ${t.skeleton}`} /></td>
                ))}
              </tr>
            )) : sorted.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center">
                <div className={`flex flex-col items-center gap-3 ${t.emptyText}`}>
                  <span className="text-4xl">◼</span>
                  <span className="font-mono text-sm tracking-wide">אין שינועים פעילים</span>
                  <span className="text-xs">פרוס שינוע באמצעות הטופס</span>
                </div>
              </td></tr>
            ) : sorted.map(m => (
              <tr key={m.id} className={`border-b ${t.border} ${t.rowHover} transition-colors group`}>
                <td className="px-3 py-2.5 max-w-[220px]">
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[10px] truncate ${t.textSub}`}><span className="text-green-500 ml-1">▲</span>{m.pickup_location}</span>
                    <span className={`text-[10px] truncate ${t.textSub}`}><span className="text-red-500 ml-1">▼</span>{m.destination}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`font-mono font-bold text-sm ${t.text}`}>{m.passengers}</span>
                </td>
                <td className="px-3 py-2.5"><StatusBadge status={m.status} /></td>
                <td className="px-3 py-2.5"><span className={`font-mono text-[11px] ${t.textFaint}`}>{formatElapsed(m.created_at)}</span></td>
                <td className="px-3 py-2.5 text-left">
                  <div className="flex items-center justify-start gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleCancelClick(m.id)}
                      className={`px-2 py-1 rounded text-[10px] font-mono tracking-wide border transition-all
                        ${cancelConfirm === m.id ? "bg-red-800 border-red-600 text-red-100" : `${t.border} ${t.textFaint} hover:border-red-700 hover:text-red-400`}`}>
                      {cancelConfirm === m.id ? "לאשר?" : "ביטול"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
          <thead className={`border-b ${t.tableHdr}`}>
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
              <tr key={m.id} className={`border-b ${t.border} ${t.rowHover} transition-colors`}>
                <td className="px-3 py-2.5 max-w-[220px]">
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[10px] truncate ${t.textSub}`}>{m.pickup_location} ← {m.destination}</span>
                  </div>
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
      {/* Title */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="grid grid-cols-3 gap-0.5 w-4 h-4 opacity-60 flex-shrink-0">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="bg-cyan-400 rounded-sm" />)}
        </div>
        <h1 className={`font-mono font-bold tracking-wide text-sm md:text-base truncate ${t.text}`}>מפקדת שינועים</h1>
        <span className={`font-mono text-[10px] tracking-wide hidden md:inline ${t.textFaint}`}>שליטה מבצעית</span>
      </div>
      {/* Center: active count */}
      <div className={`flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded border flex-shrink-0 ${t.dark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className={`font-mono text-[11px] tracking-wide ${t.text}`}>{activeMissionCount} פעיל</span>
      </div>
      {/* Right: clock + toggle */}
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

  const dispatchForm = (
    <DispatchForm onMissionCreated={(m) => { addMission(m); setMobileTab("missions"); }} t={t} />
  );
  const activeMissionsTable = (
    <ActiveMissionsTable missions={missions} loading={loading} lastRefresh={lastRefresh} onCancel={handleCancel} t={t} />
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
            {activeMissionsTable}
            <div className={`h-px ${t.dark ? "bg-slate-800" : "bg-slate-200"}`} />
            {recentTripsTable}
          </div>
        </div>
        {/* Mobile tab bar */}
        <div className={`flex-shrink-0 flex border-t ${t.border} ${t.panel}`}>
          <button
            onClick={() => setMobileTab("missions")}
            className={`flex-1 py-3 text-xs font-mono font-bold tracking-wide transition-all
              ${mobileTab === "missions"
                ? "text-cyan-400 border-t-2 border-cyan-500 -mt-px"
                : `${t.textFaint}`}`}
          >
            שינועים
          </button>
          <button
            onClick={() => setMobileTab("dispatch")}
            className={`flex-1 py-3 text-xs font-mono font-bold tracking-wide transition-all
              ${mobileTab === "dispatch"
                ? "text-cyan-400 border-t-2 border-cyan-500 -mt-px"
                : `${t.textFaint}`}`}
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
            {activeMissionsTable}
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

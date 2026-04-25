'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { Mission, MissionStatus } from '@/lib/types'
import {
  detectPushSupport,
  postSubscriptionToServer,
  subscribeToPush,
  type PushStatus,
} from '@/lib/pushClient'

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

function playBeep() {
  try {
    const audio = new Audio('/alert.mp3')
    audio.volume = 0.8
    audio.play().catch(() => {})
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

interface Th {
  dark: boolean
  bg: string
  bgPanel: string
  bgCard: string
  bgSubtle: string
  text: string
  textSub: string
  textFaint: string
  border: string
  borderMd: string
}

function getTheme(dark: boolean): Th {
  return dark
    ? {
        dark,
        bg: 'bg-neutral-950',
        bgPanel: 'bg-neutral-900',
        bgCard: 'bg-neutral-900',
        bgSubtle: 'bg-neutral-900/60',
        text: 'text-white',
        textSub: 'text-neutral-500',
        textFaint: 'text-neutral-700',
        border: 'border-neutral-800',
        borderMd: 'border-neutral-700',
      }
    : {
        dark,
        bg: 'bg-slate-100',
        bgPanel: 'bg-white',
        bgCard: 'bg-white',
        bgSubtle: 'bg-slate-50',
        text: 'text-slate-900',
        textSub: 'text-slate-500',
        textFaint: 'text-slate-400',
        border: 'border-slate-200',
        borderMd: 'border-slate-300',
      }
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function MapPinIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function FlagIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}
function UserIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function SunIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Mission Card
// ---------------------------------------------------------------------------

interface MissionCardProps {
  mission: Mission
  onComplete: (id: string) => void
  completing: boolean
  t: Th
}

function MissionCard({ mission, onComplete, completing, t }: MissionCardProps) {
  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm ${t.bgCard} ${t.borderMd}`}>
      <div className="px-5 pt-5 pb-4 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 text-emerald-500">
            <MapPinIcon />
          </div>
          <div>
            <p className={`text-xs font-semibold mb-0.5 ${t.textSub}`}>איסוף</p>
            <p className={`text-lg font-bold leading-snug ${t.text}`}>{mission.pickup_location}</p>
          </div>
        </div>
        <div className={`h-px mx-8 ${t.dark ? 'bg-neutral-800' : 'bg-slate-200'}`} />
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 text-blue-500">
            <FlagIcon />
          </div>
          <div>
            <p className={`text-xs font-semibold mb-0.5 ${t.textSub}`}>יעד</p>
            <p className={`text-lg font-bold leading-snug ${t.text}`}>{mission.destination}</p>
          </div>
        </div>
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${t.dark ? 'bg-neutral-800/60' : 'bg-slate-100'}`}>
          <div className={t.textSub}>
            <UserIcon />
          </div>
          <p className={`text-xs font-semibold ${t.textSub}`}>נוסעים</p>
          <p className={`text-2xl font-black mr-auto ${t.text}`}>{mission.passengers}</p>
        </div>
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={() => onComplete(mission.id)}
          disabled={completing}
          className="w-full min-h-[64px] bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-black rounded-xl transition-all duration-150 shadow-md shadow-emerald-900/30"
        >
          {completing ? 'מעדכן...' : 'הושלם'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shift Gate
// ---------------------------------------------------------------------------

interface ShiftGateProps {
  onStart: () => void
  t: Th
  starting: boolean
}

function ShiftGate({ onStart, t, starting }: ShiftGateProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-20 text-center">
      <div className={`text-5xl font-black mb-2 tracking-tight ${t.text}`}>מפקדת שינועים</div>
      <div className={`h-1 w-20 mx-auto rounded-full my-6 ${t.dark ? 'bg-neutral-700' : 'bg-slate-300'}`} />
      <button
        onClick={onStart}
        disabled={starting}
        className="w-full max-w-xs min-h-[72px] bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-60 text-white text-2xl font-black rounded-2xl transition-all duration-150 shadow-lg shadow-emerald-900/40 mt-2"
      >
        {starting ? 'מתחיל משמרת...' : 'התחל משמרת'}
      </button>
      <p className={`mt-5 text-xs font-semibold ${t.textFaint}`}>
        יש להתחיל משמרת כדי לקבל שינועים והתראות
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Waiting state
// ---------------------------------------------------------------------------

function WaitingState({ t }: { t: Th }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-20 text-center">
      <div className={`text-6xl font-black mb-4 ${t.text}`} style={{ letterSpacing: '0.1em' }}>המתנה</div>
      <div className={`h-1 w-24 mx-auto rounded-full mb-6 ${t.dark ? 'bg-neutral-700' : 'bg-slate-300'}`} />
      <div className="flex items-center gap-2.5 justify-center">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
        <span className="text-emerald-400 font-bold">פנוי — ממתין לשינועים</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

const POLL_INTERVAL = 30_000 // fallback poll every 30s in case SSE drops

interface MissionsResponse {
  data?: Mission[] | null
  error?: string | null
}

function isActive(status: MissionStatus): boolean {
  return status !== 'completed' && status !== 'cancelled'
}

export default function DriverMobileView() {
  const [dark, setDark] = useState(true)
  const [isShiftStarted, setIsShiftStarted] = useState(false)
  const [missions, setMissions] = useState<Mission[]>([])
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [pushStatus, setPushStatus] = useState<PushStatus>('unknown')
  const [pushMessage, setPushMessage] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const prevCountRef = useRef<number>(0)
  const t = getTheme(dark)

  // ── Fetch active missions ────────────────────────────────────────────────

  const loadMissions = useCallback(async () => {
    try {
      const res = await fetch('/api/missions')
      const json = (await res.json()) as MissionsResponse
      const active: Mission[] = (json.data ?? [])
        .filter(m => isActive(m.status))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      if (active.length > prevCountRef.current) playBeep()
      prevCountRef.current = active.length

      setMissions(active)
    } catch {
      setError('שגיאה בטעינת שינועים')
      window.setTimeout(() => setError(null), 4000)
    }
  }, [])

  // ── Push feature detection (runs once on mount) ──────────────────────────

  useEffect(() => {
    const support = detectPushSupport()
    if (!support.supported) {
      setPushStatus('unsupported')
      if (support.reason === 'ios-not-installed') {
        setPushStatus('needs-install')
        setPushMessage('להתראות ב-iPhone: לחץ על כפתור השיתוף בספארי ובחר "הוסף למסך הבית". פתח את האפליקציה משם.')
      } else {
        setPushMessage('הדפדפן לא תומך בהתראות דחיפה.')
      }
      return
    }

    const perm = typeof Notification !== 'undefined' ? Notification.permission : 'default'
    if (perm === 'granted')       setPushStatus('granted')
    else if (perm === 'denied')   setPushStatus('denied')
    else                          setPushStatus('prompt')
  }, [])

  // ── SSE stream for instant updates ───────────────────────────────────────

  useEffect(() => {
    if (!isShiftStarted) return
    let es: EventSource | null = null
    let retryTimeout: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      es = new EventSource('/api/missions/stream')
      es.onmessage = (e) => {
        if (e.data === 'refresh') loadMissions()
      }
      es.onerror = () => {
        es?.close()
        retryTimeout = setTimeout(connect, 5_000)
      }
    }

    connect()
    return () => {
      es?.close()
      if (retryTimeout) clearTimeout(retryTimeout)
    }
  }, [isShiftStarted, loadMissions])

  // ── Fallback poll (30s) in case SSE is unavailable ───────────────────────

  useEffect(() => {
    if (!isShiftStarted) return
    const id = setInterval(loadMissions, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [isShiftStarted, loadMissions])

  // ── Reload when tab becomes visible ──────────────────────────────────────

  useEffect(() => {
    if (!isShiftStarted) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadMissions()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isShiftStarted, loadMissions])

  // ── Start shift + subscribe to push ──────────────────────────────────────

  const handleStartShift = useCallback(async () => {
    playBeep() // unlock audio within user gesture

    setStarting(true)
    try {
      const support = detectPushSupport()
      if (!support.supported) {
        if (support.reason === 'ios-not-installed') {
          setPushStatus('needs-install')
          setPushMessage('להתראות ב-iPhone: הוסף את האתר למסך הבית ופתח משם.')
        } else {
          setPushStatus('unsupported')
          setPushMessage('הדפדפן הזה לא תומך בהתראות. ניסה דפדפן אחר.')
        }
      } else {
        setPushStatus('requesting')
        let permission: NotificationPermission
        try {
          permission = await Notification.requestPermission()
        } catch {
          permission = 'default'
        }

        if (permission === 'granted') {
          setPushStatus('granted')
          try {
            const sub = await subscribeToPush()
            await postSubscriptionToServer(sub)
            setPushStatus('subscribed')
            setPushMessage(null)
          } catch (err) {
            setPushStatus('error')
            setPushMessage('נכשל בהרשמת התראות. נסה לרענן ולהתחיל משמרת שוב.')
            console.error('[push] subscribe failed', err)
          }
        } else if (permission === 'denied') {
          setPushStatus('denied')
          setPushMessage('ההתראות חסומות. יש לאפשר אותן בהגדרות הדפדפן כדי לקבל שינועים.')
        } else {
          setPushStatus('prompt')
        }
      }

      setIsShiftStarted(true)
      loadMissions()
    } finally {
      setStarting(false)
    }
  }, [loadMissions])

  // ── Test notification ────────────────────────────────────────────────────

  const handleTestNotification = useCallback(async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/test-notification', { method: 'POST' })
      const json = (await res.json()) as {
        data?: {
          sent: number
          failed: number
          subscribers: number
          vapidConfigured: boolean
        } | null
        error?: string | null
      }
      if (!res.ok || json.error) {
        setTestResult(json.error ?? 'שגיאה')
        return
      }
      const d = json.data!
      if (!d.vapidConfigured) {
        setTestResult('השרת לא הוגדר (VAPID). בדוק את משתני הסביבה.')
      } else if (d.subscribers === 0) {
        setTestResult('אין מנויים פעילים. התחל משמרת כדי להירשם.')
      } else {
        setTestResult(`נשלחו ${d.sent} מתוך ${d.subscribers} מנויים${d.failed ? ` · ${d.failed} נכשלו` : ''}`)
      }
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setTestLoading(false)
    }
  }, [])

  // ── Complete mission ─────────────────────────────────────────────────────

  const handleComplete = useCallback(async (missionId: string) => {
    setCompletingId(missionId)
    try {
      const res = await fetch(
        `/api/missions/${encodeURIComponent(missionId)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed', caller_role: 'driver' }),
        }
      )
      if (!res.ok) throw new Error('update failed')
      setMissions(prev => prev.filter(m => m.id !== missionId))
    } catch {
      setError('עדכון נכשל')
      window.setTimeout(() => setError(null), 4000)
    } finally {
      setCompletingId(null)
    }
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className={`w-full max-w-[480px] mx-auto min-h-screen flex flex-col relative font-sans transition-colors duration-200 ${t.bg}`}
      dir="rtl"
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-5 pt-10 pb-4 border-b ${t.bgPanel} ${t.border}`}>
        <div>
          <p className={`text-base font-bold ${t.text}`}>שינועים פעילים</p>
          {isShiftStarted && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              משמרת פעילה
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {missions.length > 0 && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${t.dark ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-200 text-slate-600'}`}>
              {missions.length} שינועים
            </span>
          )}
          {isShiftStarted && (
            <button
              onClick={loadMissions}
              aria-label="רענן"
              className={`px-2.5 py-1.5 rounded-full border text-xs font-mono transition-all
                ${t.dark ? 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:bg-neutral-800' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-100'}`}
            >
              ↻
            </button>
          )}
          <button
            onClick={() => setDark(d => !d)}
            aria-label="החלף מצב תצוגה"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-mono transition-all shadow
              ${dark ? 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      {/* Push status row */}
      {isShiftStarted && (
        <div className={`mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 border ${t.dark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <PushStatusBadge status={pushStatus} />
          </div>
          <button
            onClick={handleTestNotification}
            disabled={testLoading}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-all"
          >
            {testLoading ? '...' : 'בדוק'}
          </button>
        </div>
      )}

      {/* Push message (iOS install hint, denied warning, etc.) */}
      {pushMessage && (
        <div className={`mx-4 mt-2 rounded-xl border px-4 py-3 text-xs font-semibold leading-relaxed ${t.dark ? 'border-amber-700 bg-amber-950/60 text-amber-200' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
          {pushMessage}
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div className={`mx-4 mt-2 rounded-xl border px-4 py-3 text-sm font-semibold ${t.dark ? 'border-blue-700 bg-blue-950/60 text-blue-200' : 'border-blue-300 bg-blue-50 text-blue-900'}`}>
          {testResult}
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="mx-4 mt-3 bg-red-900 border border-red-600 rounded-xl px-4 py-3 text-red-100 text-sm font-semibold shadow-xl">
          {error}
        </div>
      )}

      {/* Content */}
      {!isShiftStarted ? (
        <ShiftGate onStart={handleStartShift} t={t} starting={starting} />
      ) : missions.length === 0 ? (
        <WaitingState t={t} />
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {missions.map(mission => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onComplete={handleComplete}
              completing={completingId === mission.id}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Push status badge
// ---------------------------------------------------------------------------

function PushStatusBadge({ status }: { status: PushStatus }) {
  const { label, cls } = statusBadge(status)
  return <span className={`text-xs font-bold ${cls}`}>{label}</span>
}

function statusBadge(status: PushStatus): { label: string; cls: string } {
  switch (status) {
    case 'subscribed':  return { label: '🔔 התראות פעילות',        cls: 'text-emerald-400' }
    case 'granted':     return { label: '🔔 הרשאה אושרה',          cls: 'text-emerald-400' }
    case 'requesting':  return { label: '⏳ מבקש הרשאה...',         cls: 'text-yellow-400'  }
    case 'denied':      return { label: '🔕 התראות חסומות',        cls: 'text-red-400'     }
    case 'needs-install': return { label: '📲 דרוש התקנה למסך הבית', cls: 'text-amber-400' }
    case 'unsupported': return { label: '🚫 לא נתמך בדפדפן',        cls: 'text-neutral-400' }
    case 'error':       return { label: '⚠️ שגיאה בהתראות',        cls: 'text-red-400'     }
    case 'prompt':      return { label: '🔔 טרם אושרו',             cls: 'text-neutral-400' }
    default:            return { label: '🔔 מתחיל...',              cls: 'text-neutral-400' }
  }
}

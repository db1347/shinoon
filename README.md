# Shinoon — Real-Time Driver Dispatch System

> **שינועים** | A dual-interface mission dispatch platform for managers and drivers, with real-time updates and push notifications.

---

## What It Does

Shinoon is a transport mission coordination system with two distinct interfaces:

- **Manager Dashboard** — Create, assign, and track missions in real time
- **Driver Mobile View** — Receive, accept, and complete missions on the go

Missions flow through a clear lifecycle: `pending → accepted → en_route → completed` (or `cancelled`). Managers control the flow; drivers act on it. Everything syncs instantly via Server-Sent Events and native Web Push notifications (VAPID) — no third-party push service required.

---

## Screenshots / Interfaces

| Role | URL | Description |
|------|-----|-------------|
| Manager | `http://localhost:3000` | Full dashboard — create missions, monitor drivers |
| Driver | `http://localhost:3000/driver` | Mobile-first view — accept and complete missions |

---

## Manager Dashboard

**What managers can do:**

- Create missions with pickup location, destination, passenger count, and priority
- Assign a mission directly to a specific driver, or broadcast to all available drivers
- Advance mission status through the full lifecycle
- Cancel missions at any stage
- Monitor all drivers and their real-time availability
- See a live mission feed with filtering

**Priority levels:** `low` | `normal` | `high` | `urgent`

---

## Driver Mobile View

**What drivers can do:**

- Start or end a shift to appear as available/unavailable
- View assigned missions and available broadcast missions
- Accept broadcast missions
- Mark missions as completed
- Receive push notifications for incoming missions (even when the app is in the background)
- Enable/disable notification permissions inline

**UX details:**
- Audio beep alert on new mission arrival
- Dark theme by default for field use
- Polling fallback (30s) if real-time connection drops
- RTL layout, Hebrew UI

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| Database | Upstash Redis (in-memory fallback for dev) |
| Push Notifications | Native Web Push (VAPID) via `web-push` |
| Real-time | Server-Sent Events (SSE) |
| Deployment | Vercel |
| PWA | Service Worker + Web App Manifest |

---

## Project Structure

```
app/
├── page.tsx                    # Manager Dashboard route (/)
├── driver/page.tsx             # Driver view route (/driver)
├── layout.tsx                  # Root layout — Hebrew RTL, PWA config
├── globals.css                 # Global styles
└── api/
    ├── drivers/route.ts        # GET /api/drivers
    ├── missions/route.ts       # GET, POST /api/missions
    ├── missions/[id]/status/   # PATCH /api/missions/[id]/status
    ├── missions/stream/        # GET /api/missions/stream (SSE)
    ├── subscribe/              # POST / DELETE — Web Push subscription mgmt
    └── test-notification/      # POST /api/test-notification

components/
├── ManagerDashboard.tsx        # Manager UI
└── DriverMobileView.tsx        # Driver UI

lib/
├── types.ts                    # Shared TypeScript types & enums
├── localDb.ts                  # Redis / in-memory data layer
├── logger.ts                   # Level-based server logger
├── push.ts                     # Server-side Web Push sender (web-push + VAPID)
└── pushClient.ts               # Browser-side feature detection + subscribe flow

public/
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker — push + notificationclick
├── alert.mp3                   # Mission arrival beep
└── icon-192.png, icon-512.png  # App icons

data/
└── db.json                     # Seed data (1 manager + 6 drivers)
```

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/drivers` | GET | List all drivers with availability status |
| `/api/missions` | GET | List missions (filter by `status`, `driver_id`) |
| `/api/missions` | POST | Create a new mission |
| `/api/missions/[id]/status` | PATCH | Update mission status |
| `/api/missions/stream` | GET | SSE stream for real-time mission updates |
| `/api/subscribe` | POST | Register a browser PushSubscription |
| `/api/subscribe` | DELETE | Remove a PushSubscription by endpoint |
| `/api/test-notification` | POST | Fan out a test push to every stored subscription |

### Create Mission — POST `/api/missions`

```json
{
  "pickup_location": "תחנה מרכזית",
  "destination": "בית חולים תל השומר",
  "passengers": 3,
  "priority": "high",
  "assigned_driver_id": "driver-uuid",
  "broadcast": false,
  "created_by": "manager-uuid"
}
```

### Update Status — PATCH `/api/missions/[id]/status`

```json
{
  "status": "en_route",
  "driver_id": "driver-uuid",
  "caller_role": "driver"
}
```

**Allowed transitions:**

| Role | From | To |
|------|------|----|
| Manager | `pending` | `accepted`, `cancelled` |
| Manager | `accepted` | `en_route`, `cancelled` |
| Manager | `en_route` | `completed`, `cancelled` |
| Driver | `pending` | `completed` |
| Driver | `accepted` | `completed` |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```bash
# Upstash Redis (cloud persistence — optional)
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Native Web Push (VAPID). Generate once with:
#   node -e "console.log(require('web-push').generateVAPIDKeys())"
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_CONTACT=mailto:you@example.com
```

> **Note:** If Redis credentials are not provided, the app falls back to an in-memory store. Data will reset on server restart. This is fine for local development, but in production push subscriptions will disappear on every deploy without Redis.

### 3. Run the development server

```bash
npm run dev
```

- Manager: [http://localhost:3000](http://localhost:3000)
- Driver: [http://localhost:3000/driver](http://localhost:3000/driver)

### 4. Build for production

```bash
npm run build
npm start
```

---

## Environment Setup

### Upstash Redis

1. Create a free account at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the REST URL and token into `.env.local`

### Web Push (VAPID)

No third-party account needed. Push runs on the web standard.

1. Generate a keypair once:
   ```bash
   node -e "console.log(require('web-push').generateVAPIDKeys())"
   ```
2. Paste the two values into `.env.local` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.
3. Set `VAPID_CONTACT` to a `mailto:` string — push services use it for abuse contact.
4. Add the same three variables to your Vercel project settings (and re-deploy).

---

## Deployment (Vercel)

1. Push the project to a GitHub repository
2. Import the repository in [Vercel](https://vercel.com)
3. Add all environment variables in the Vercel project settings (Upstash + VAPID)
4. Deploy — Vercel handles the rest

> The service worker (`/sw.js`) is served with `Service-Worker-Allowed: /` by `next.config.ts`, so it controls the whole origin.

---

## PWA / Mobile Install

Shinoon is a Progressive Web App.

**Android (Chrome / Edge):** push works in the browser tab. Tapping "Add to Home Screen" is optional but gives a full-screen experience.

**iOS (Safari, 16.4+):** push only works when the site is launched as an installed PWA. The driver must:
1. Open the driver view in Safari
2. Tap the Share button → "Add to Home Screen"
3. Launch the app from the Home Screen icon
4. Tap "Start Shift" — Safari will prompt for notification permission

Without this step the driver view will display a clear Hebrew hint telling the user to install the app first.

---

## Data Model

```typescript
type Mission = {
  id: string
  pickup_location: string
  destination: string
  passengers: number
  priority: "low" | "normal" | "high" | "urgent"
  status: "pending" | "accepted" | "en_route" | "completed" | "cancelled"
  broadcast: boolean
  assigned_driver_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  accepted_at: string | null
  completed_at: string | null
}

type User = {
  id: string
  full_name: string
  role: "manager" | "driver"
  phone: string | null
  status: "available" | "on_mission" | "offline"
  created_at: string
}

type StoredPushSubscription = {
  endpoint: string
  keys: { p256dh: string; auth: string }
  created_at: string
  user_agent: string | null
}
```

---

## Notes

- UI and seed data are in Hebrew (RTL layout)
- No authentication system yet — role is determined client-side
- The `schema.sql` file contains a Supabase/PostgreSQL schema for future migration from Redis

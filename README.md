# Shinoon — Real-Time Driver Dispatch System

> **שינועים** | A dual-interface mission dispatch platform for managers and drivers, with real-time updates and push notifications.

---

## What It Does

Shinoon is a transport mission coordination system with two distinct interfaces:

- **Manager Dashboard** — Create, assign, and track missions in real time
- **Driver Mobile View** — Receive, accept, and complete missions on the go

Missions flow through a clear lifecycle: `pending → accepted → en_route → completed` (or `cancelled`). Managers control the flow; drivers act on it. Everything syncs instantly via Server-Sent Events and OneSignal push notifications.

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
| Push Notifications | OneSignal |
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
    └── test-notification/      # POST /api/test-notification

components/
├── ManagerDashboard.tsx        # Manager UI (~750 lines)
└── DriverMobileView.tsx        # Driver UI (~450 lines)

lib/
├── types.ts                    # Shared TypeScript types & enums
├── localDb.ts                  # Redis / in-memory data layer
└── onesignal.ts                # Push notification helper

public/
├── manifest.json               # PWA manifest
├── OneSignalSDKWorker.js       # Service worker for push
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
| `/api/test-notification` | POST | Trigger a test push notification |

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
# Upstash Redis (cloud persistence)
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# OneSignal (push notifications)
NEXT_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key
```

> **Note:** If Redis credentials are not provided, the app falls back to an in-memory store. Data will reset on server restart. This is fine for local development.

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

### OneSignal

1. Create a free account at [onesignal.com](https://onesignal.com)
2. Create a new Web Push app
3. Copy the App ID and REST API Key into `.env.local`
4. Make sure your app domain is configured in OneSignal settings

---

## Deployment (Vercel)

1. Push the project to a GitHub repository
2. Import the repository in [Vercel](https://vercel.com)
3. Add all environment variables in the Vercel project settings
4. Deploy — Vercel handles the rest

> The `Service-Worker-Allowed` header required by OneSignal is already configured in `next.config.ts`.

---

## PWA / Mobile Install

Shinoon is a Progressive Web App. On mobile:

- Open the driver view in a browser
- Use "Add to Home Screen" to install as a native-like app
- Push notifications work even when the app is in the background

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
  assigned_driver_id?: string
  broadcast: boolean
  created_by: string
  created_at: string
  updated_at: string
}

type User = {
  id: string
  name: string
  role: "manager" | "driver"
  rank?: string
  status: "available" | "on_mission" | "offline"
  onesignal_player_id?: string
}
```

---

## Notes

- UI and seed data are in Hebrew (RTL layout)
- No authentication system yet — role is determined client-side
- The `schema.sql` file contains a Supabase/PostgreSQL schema for future migration from Redis

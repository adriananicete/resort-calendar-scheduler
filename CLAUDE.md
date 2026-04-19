# Resort Calendar Scheduler — Claude Code Guide

## Project Overview
MERN stack one-page booking calendar for a private resort. Clients fill out a booking form (left panel) and see a Google Calendar-style month view (right panel). Real-time sync via Socket.io prevents double bookings. No authentication.

## Tech Stack
- **Frontend:** React 18 (Vite) + TailwindCSS v3 + react-big-calendar + react-datepicker + react-hot-toast + react-router-dom
- **Backend:** Node.js + Express (ESM) + Socket.io v4
- **Database:** MongoDB via Mongoose v8
- **Real-time:** Socket.io — events: `booking:created`, `booking:updated`, `booking:deleted`

## Project Structure
```
Calendar-Scheduler/
├── package.json              ← root: concurrently dev scripts
├── server/
│   ├── server.js             ← Express + Socket.io + MongoDB + pending cleanup interval
│   ├── models/Booking.js     ← Mongoose schema (includes status, bookingId, expiresAt)
│   ├── routes/bookings.js    ← CRUD routes + conflict-check + status-check endpoint
│   ├── routes/webhooks.js    ← GoHighLevel payment webhook receiver
│   ├── utils/conflictCheck.js← MongoDB overlap query logic (excludes expired)
│   ├── utils/generateBookingId.js ← BK-YYYYMMDD-NNN generator
│   ├── utils/resetBookings.js ← one-off DB wipe script (deletes all bookings)
│   └── middleware/validateBooking.js ← express-validator rules
└── client/
    ├── vite.config.js        ← proxy /api → localhost:5000
    ├── vercel.json           ← SPA rewrite for Vercel deployment
    ├── tailwind.config.js
    └── src/
        ├── main.jsx          ← BrowserRouter + routes (/ and /booking/success/:bookingId)
        ├── App.jsx           ← main layout: form (40%) | calendar (60%), activeTourType state
        ├── components/
        │   ├── BookingForm.jsx        ← booking form with GHL redirect, tour type sync
        │   ├── BookingConfirmModal.jsx ← review modal before final submit
        │   ├── PaymentReminderModal.jsx ← post-create modal with GHL payment link
        │   ├── CalendarView.jsx       ← react-big-calendar with tour type filter tabs
        │   └── BookingModal.jsx       ← exists but NOT used (disabled for client privacy)
        ├── pages/
        ���   └── BookingSuccess.jsx     ← post-payment polling page
        ├── hooks/
        │   ├── useBookings.js        ← fetch all + socket event listeners
        │   └── useConflictCheck.js   ← debounced live conflict check
        ├── services/api.js   ← axios instance, all API call functions + getBookingStatus
        ├── socket/socket.js  ← singleton socket.io-client
        └── utils/tourTypeHelpers.js  ← calculateCheckIn, calculateCheckOut, TOUR_COLORS, ROOM_UNITS, getEventStyle(status)
```

## Running the App

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`)

### Commands
```bash
# Install all dependencies (run once)
npm run install:all

# Start both client and server concurrently
npm run dev
# → Server: http://localhost:5000
# → Client: http://localhost:5173
```

### Individual
```bash
cd server && npm run dev   # nodemon, port 5000
cd client && npm run dev   # vite, port 5173
```

### Reset Local DB (wipe all bookings)
```bash
cd server && node utils/resetBookings.js
```
Uses `MONGODB_URI` from `server/.env` — connects, runs `Booking.deleteMany({})`, disconnects.

## Environment Variables

`server/.env` (already created, do not commit):
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/resort-scheduler
CLIENT_URL=http://localhost:5173
GHL_PAYMENT_URL=https://your-ghl-order-form-url.com
GHL_WEBHOOK_SECRET=your-shared-secret-here

# Admin alerts — fires when a GHL "paid" webhook has no matching booking.
# Gmail App Password required (needs 2FA on the account):
# https://myaccount.google.com/apppasswords
ALERT_EMAIL_USER=your.email@gmail.com
ALERT_EMAIL_PASSWORD=your-16-char-app-password
ALERT_EMAIL_TO=admin@example.com   # comma-separated for multiple recipients
```

`client/.env`:
```
VITE_API_URL=/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GHL_PAYMENT_URL=https://your-ghl-order-form-url.com
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | Fetch all bookings |
| GET | `/api/bookings/conflict-check` | Live conflict check (query: roomUnit, checkIn, checkOut, excludeId?) |
| GET | `/api/bookings/status/:bookingId` | Check booking payment status (for success page polling) |
| POST | `/api/bookings` | Create booking with status=pending + bookingId (409 if conflict) |
| PUT | `/api/bookings/:id` | Update booking (409 if conflict) |
| DELETE | `/api/bookings/:id` | Delete booking |
| POST | `/api/webhooks/gohighlevel` | GHL payment webhook — confirms pending booking by email match |

## MongoDB Schema (Booking)

| Field | Type | Notes |
|-------|------|-------|
| bookingId | String | unique, human-readable (BK-YYYYMMDD-NNN) |
| guestName | String | required |
| contactNumber | String | required |
| email | String | required, lowercase |
| tourType | String | enum: `day` / `night` / `overnight` |
| checkIn | Date | required |
| checkOut | Date | required, auto-calculated by frontend |
| roomUnit | String | enum: Kubo A/B/C/D, Villa 1/2 |
| adults | Number | required, min 1 |
| children | Number | default 0 |
| amount | Number | required |
| paymentType | String | enum: `downpayment` / `full` |
| specialRequest | String | optional |
| status | String | enum: `pending` / `confirmed` / `expired`, default: `confirmed` |
| expiresAt | Date | TTL field — pending bookings auto-delete after 60 min |

## Tour Types & Checkout Logic

| Tour Type | Check-in | Checkout |
|-----------|----------|----------|
| `day` | 8:00 AM | Same day, 5:00 PM |
| `night` | 7:00 PM | +1 day, 6:00 AM |
| `overnight` | 7:00 PM | +1 day, 5:00 PM |

Logic is in `client/src/utils/tourTypeHelpers.js`:
- `calculateCheckIn(selectedDate, tourType)` — DatePicker gives midnight; this sets the real start time (8am for day, 7pm for night/overnight).
- `calculateCheckOut(checkInDate, tourType)` — computes the end time per table above.

**Critical:** `BookingForm.jsx` must use `calculateCheckIn` to derive `actualCheckIn` and pass that to `useConflictCheck` and the API payload. Sending the raw midnight date causes false conflicts (e.g. night tour Apr 23 saved at 00:00 would overlap a new day tour Apr 23 also at 00:00, even though real times are 7pm vs 8am — no actual overlap).

## Calendar Behavior & Design

### Tour Type Filter Tabs
- Calendar header has three pill-shaped tabs: **Day Tour** / **Night Tour** / **Overnight**
- Default on page load is **Day Tour**
- Selecting a tab filters the calendar to show only that tour type's bookings
- Tabs sync two-way with the form's tour type radio buttons via `activeTourType` state in `App.jsx`
- Fully booked dates (all 6 rooms taken for that tour type) get a light red background via `dayPropGetter`

### Color Coding
| Tour Type | Color | Hex |
|-----------|-------|-----|
| Day Tour | Amber | `#F59E0B` |
| Night Tour | Indigo | `#6366F1` |
| Overnight | Purple | `#8B5CF6` |

### Event Display (Privacy)
- Calendar events show **tour type + room** (e.g. `Day Tour: Kubo A`)
- **Pending bookings** appear with 55% opacity + dashed border (visually muted but still block the slot)
- Clicking a booked event does **nothing** — guest details are intentionally hidden from public view
- `BookingModal.jsx` exists but is not wired up (kept for potential future admin use)

### Event Span (Visual Clipping)
`CalendarView.jsx` → `getDisplayEnd(booking)` decouples the **visual span** from the actual checkout time:
- **Day tour** — shown on check-in date only (actual: same-day 5pm)
- **Night tour** — **clipped** to end of check-in date (actual: next-day 6am). The 6am overflow doesn't block anything (next day's earliest tour is 8am day tour), so spanning two days in the UI would mislead users into thinking the next day is taken.
- **Overnight** — spans **both days** on the calendar (actual: next-day 5pm). This genuinely blocks next day's day tour (8am–5pm fully overlaps), so both days are correctly shown as occupied.

Backend conflict logic is untouched — it uses real `checkIn`/`checkOut` times. Only the calendar render is adjusted.

### Controlled Calendar State
`CalendarView.jsx` uses controlled `date` and `view` state with `onNavigate` and `onView` callbacks. Do **not** switch back to `defaultView` — it breaks navigation.
```jsx
const [currentDate, setCurrentDate] = useState(new Date());
const [currentView, setCurrentView] = useState('month');
<Calendar date={currentDate} view={currentView}
  onNavigate={setCurrentDate} onView={setCurrentView} />
```

### Height Matching
`App.jsx` uses a `ResizeObserver` on the form panel ref to measure its height, then passes `formHeight` as a prop to `CalendarView`. The calendar computes: `calHeight = formHeight - headerHeight - 32px padding`. Do not use `height: '100%'` on the Calendar component — use a fixed pixel value only.

## UI Design System (shadcn/ui)

### Direction
**Clean monochrome + tour colors as accents only.** Linear/Notion/Vercel-tier neutrality. No gradient backgrounds, no colored panel fills, no colored button fills. Tour colors (amber/indigo/purple) appear only as: calendar event fills, active tour-tab ring + dot, and radio-option left-border strip (`border-l-4`).

### Setup
- Theme: **zinc** (shadcn default), path alias `@/` → `client/src/`, `cn()` helper in `client/src/lib/utils.js`.
- Primitives in `client/src/components/ui/`: `button`, `card`, `dialog`, `input`, `label`, `radio-group`, `select`, `separator`, `textarea`, `alert`.
- `dialog.jsx` has a custom `showClose` prop — preserve when regenerating.

### Conventions
| Concern | Rule |
|---|---|
| Background | `bg-muted/40` for app shell (no gradients) |
| Surfaces | `<Card>` for form, calendar wrapper, success page, loading state |
| Radius | `rounded-md` for inputs/buttons, `rounded-lg` for cards/dialogs (retire `rounded-xl`/`rounded-2xl` on form elements) |
| Labels | Sentence case, `text-sm font-medium text-foreground mb-1.5` (no uppercase + tracking-wide) |
| Primary action | `<Button>` default variant (Review Booking, Confirm & Book) |
| Secondary action | `<Button variant="outline">` (Cancel, Go Back) |
| Toolbar action | `<Button variant="secondary">` (New Booking) |
| Icon-only | `<Button variant="ghost" size="icon">` (calendar arrows, close X) |
| Errors | `<Alert variant="destructive">` for conflict warnings |

### Do Not
- **Do not swap** `react-datepicker` or `react-big-calendar`. Style DatePicker via `customInput={<Input />}`; keep `dayClassName` for `.date-already-booked`.
- **Do not restyle `.rbc-*`** classes beyond cosmetic token swaps (scrollbar, `.rbc-today` circle, `.rbc-header` color).
- **Do not change** `EMPTY_FORM`, `handleChange`, `handleNumberChange`, `handleSubmit`, `handleConfirm`, `resetForm`, `bookedDates`, `actualCheckIn`, or any `useEffect` in `BookingForm.jsx` when modernizing UI.
- **Do not change** controlled `date`/`view` state or the `ResizeObserver` height-match in `App.jsx`.
- **Do not delete** `BookingModal.jsx` (reserved for future admin use).
- **Do not render** guest name/email in the conflict warning or calendar events — privacy invariant.

### RadioGroup adapter (for components expecting `onChange` events)
shadcn `<RadioGroup>` returns a raw string via `onValueChange`. When adapting legacy `handleChange({ target: { name, value }})` consumers, wrap:
```jsx
onValueChange={(v) => { handleChange({ target: { name: 'tourType', value: v }}); onTourTypeChange?.(v); }}
```
This preserves two-way tour-type sync between form radios and calendar tabs.

## Double Booking Logic

MongoDB overlap query in `server/utils/conflictCheck.js`:
```js
{
  roomUnit,
  checkIn:  { $lt: reqCheckOut },
  checkOut: { $gt: reqCheckIn },
  status:   { $ne: 'expired' },   // expired pending bookings don't block
}
```
- POST: no excludeId
- PUT: pass `excludeId` to avoid self-conflict
- `GET /api/bookings` also filters out `status: expired` so the client never renders or counts them.

Frontend checks live via `useConflictCheck` hook (debounced 500ms). The hook receives **`actualCheckIn`** from `BookingForm.jsx` (not the raw midnight DatePicker date) so time-of-day is accurate. Submit is blocked if conflict is detected.

**Privacy rule:** Conflict warning must never show the name of the existing guest — only show the room name and that it is unavailable. This is enforced in `BookingForm.jsx` conflict warning section.

## Booking Form Flow

1. Client fills out form
2. Clicks **"Review Booking"** → triggers form validation
3. If valid → `BookingConfirmModal` opens showing all details
4. Client reviews → clicks **"Confirm & Book ✓"** → POST creates booking with `status: pending`
5. On success → redirect to GoHighLevel payment page (GHL)
6. After payment → GHL webhook confirms booking → success page polls and shows confirmation

**For edits (PUT):** no payment redirect — booking updates directly, toast + form resets.

## GoHighLevel Payment Flow

```
Client submits form → POST /api/bookings (status: pending, expiresAt: +30min)
                    → redirect to GHL order form URL with prefill params:
                      ?first_name=...&last_name=...&email=...&phone=...
                      &amount=...&bookingId=...
                    → GHL form auto-fills standard fields; client reviews and pays
                    → GHL workflow triggers "Payment Received"
                    → GHL sends POST /api/webhooks/gohighlevel
                      { bookingId, email, payment_status: "paid" }
                    → backend matches by bookingId first (typo-proof);
                      falls back to email if bookingId missing or no match
                    → status updated to "confirmed", expiresAt cleared
                    → io.emit('booking:updated') → all clients see confirmed booking
                    → success page (/booking/success/:bookingId) polls until confirmed
```

**Why prefill + bookingId match?** Re-typing the email on GHL is a silent-failure risk — a typo makes the webhook unable to find the pending booking, so the reservation expires after 60 min with no signal to client or host. Prefilling removes the typo vector, and matching on the system-generated `bookingId` eliminates it entirely once GHL is configured to pass that field through.

**GHL Form Setup (to configure later on the GHL side):**
- Ensure the GHL order-form field keys are lowercase exact: `first_name`, `last_name`, `email`, `phone`. These are GHL's standard URL-prefill keys.
- Add a **hidden custom field** named `bookingId` to the form so the param flows into the submission.
- In the "Payment Received" workflow webhook, include `bookingId` in the POST body alongside `email` and `payment_status`. Backend prefers `bookingId` but still accepts email-only payloads for backward compatibility.
- (Optional, defense-in-depth) Mark the email field read-only on the GHL form so clients cannot alter the prefilled value.

**Name splitting:** The form collects a single `guestName`; client-side `splitGuestName()` in `BookingForm.jsx` splits on the **first space** so compound surnames stay intact (e.g. `Juan Dela Cruz` → `first_name=Juan`, `last_name=Dela Cruz`). A single-token name (e.g. `Madonna`) yields `last_name=""`.

**Pending booking expiry:** Unpaid bookings auto-delete after 60 minutes via MongoDB TTL index + a server-side cleanup interval (every 5 min) that also emits `booking:deleted` socket events.

## Known Risks / Pre-Launch Backlog

An audit on 2026-04-18 surfaced the risks below. The system is functional end-to-end, but these items must be addressed before heavy production traffic. **Not yet implemented — this is the working backlog.** Each item lands as its own branch → commit → push → PR → merge cycle (no bundling).

### Critical — Pre-Launch (Phase A)

| # | Risk | Fix direction |
|---|------|---------------|
| **C1** (partial) | **Ghost payment** — user pays after the pending window, booking auto-deletes, webhook finds no match, returns 200 silently. Money gone, no record, no alert. | ⚠️ **Mitigated** — `expiresAt` bumped from 30→60 min to cover slow GHL payments. **Full fix still pending:** audit log of recently-deleted pendings + webhook recovery path. |
| ~~**C2**~~ | ~~**Double-booking race**~~ | ✅ **Fixed** — unique compound index on `{roomUnit, checkIn, checkOut}` (partial filter: status ∈ pending/confirmed) in `Booking.js`; POST + PUT catch E11000 and return 409. `syncIndexes()` runs on boot to replace the old non-unique index. |
| ~~**C3**~~ | ~~**Webhook auth bypass**~~ | ✅ **Fixed** — startup guard in `server/server.js` refuses to boot in production if `GHL_WEBHOOK_SECRET` is unset; webhook handler requires the secret unconditionally. |
| ~~**H1**~~ | ~~**No admin alert on unmatched webhook**~~ | ✅ **Fixed** — Nodemailer + Gmail SMTP sends an email to `ALERT_EMAIL_TO` whenever `payment_status: "paid"` arrives but no booking matches. Redacts `secret` before emailing. Fire-and-forget (webhook still returns 200 even if email fails). |

### High — Before Marketing Push (Phase B)

| # | Risk | Fix direction |
|---|------|---------------|
| ~~**H2**~~ | ~~**No cancel button** in `PaymentReminderModal`~~ | ✅ **Fixed** — outline "Cancel booking" button added below "Proceed to payment"; calls `DELETE /api/bookings/:id` (which emits `booking:deleted`), toasts, resets form. Modal receives `_id` (Mongo `_id`) since DELETE route uses `findByIdAndDelete`, not `bookingId`. |
| **H3** | **Amount URL param is client-spoofable** — user can edit URL before GHL submit. | GHL-side: lock product price (server-configured), not URL-driven. Our-side: webhook verifies amount matches booking. |
| ~~**H4**~~ | ~~`console.warn(req.body)` leaks the webhook secret~~ | ✅ **Fixed** — `safeLogFields(body)` helper in `server/routes/webhooks.js` returns only `{bookingId, email, payment_status}`. Both `console.warn(..., req.body)` call sites now pass the redacted object. Email alert path (`sendUnmatchedPaymentAlert`) already redacts `secret` server-side. |
| **H5** | `generateBookingId` race → two concurrent POSTs compute same seq → E11000 → 500 error to second user. | Catch E11000 in POST handler; retry up to 3 times. |

### Medium / Low — Phase C (Opportunistic)

- **M1** GHL field rename silently breaks prefill — document contract; add pre-launch check.
- **M2** `PaymentReminderModal` UX trap — resolved by H2.
- **M3** Success page polling conflates 404 with network blip — distinguish error types.
- **M4** Same-email multiple pendings → fallback may confirm wrong one — resolved once GHL sends `bookingId` consistently.
- **M5** Render cold-start (30s) — non-issue in practice; documented for completeness.
- **L1** `splitGuestName` edge cases (double spaces, emoji) — cosmetic.
- **L2** Schema defaults — `status` default should be `'pending'`; unused `'expired'` enum value.
- **L3** Phone not normalized before prefill — strip non-digits, normalize to `+63...`.

### Critical Files by Risk

| Risk | File | Lines |
|------|------|-------|
| C1 | `server/routes/bookings.js` | 71 (expiresAt) |
| H5 | `server/utils/generateBookingId.js`, `server/routes/bookings.js` | 7-29, 79-85 |

### Recommended Order

**Phase A:** ~~C3~~ ✅ → ~~C2~~ ✅ → ~~C1 partial~~ ⚠️ → ~~H1~~ ✅ — **Phase A complete.** **Phase B:** ~~H2~~ ✅ → ~~H4~~ ✅ → H5 → H3 (H3 needs GHL admin coord). **Phase C:** as surfaced by real usage. **C1 full fix (audit log + recovery)** remains in Phase C.

---

**Strikethrough dates in date picker:**
- When a `tourType` is selected: dates with existing bookings of that tour type show as red strikethrough
- If `roomUnit` is also selected: filtered further to only that room's bookings
- Uses `dayClassName` prop on `react-datepicker` with class `date-already-booked`
- CSS for `.date-already-booked` is in `client/src/index.css`
- Logic computed via `useMemo` in `BookingForm.jsx` using `isSameDay` from date-fns

## Real-time Socket Flow

```
Client submits → POST /api/bookings
              → server saves to MongoDB
              → io.emit('booking:created', doc)  ← all connected clients
              → useBookings.js listener fires
              → setBookings(...) → calendar re-renders
```

## Git Branch Strategy

```
main          ← stable, always deployable
└── develop   ← merge features here first
    └── feature/<name>  ← one feature per branch
```

New features: branch from `develop`, merge back to `develop`, then `develop` → `main`.

## Room Units (Placeholder — update as needed)
`Kubo A`, `Kubo B`, `Kubo C`, `Kubo D`, `Villa 1`, `Villa 2`

Defined in `client/src/utils/tourTypeHelpers.js` → `ROOM_UNITS` array.
Also validated in `server/models/Booking.js` → `roomUnit.enum`.
**Update both files** when changing room names.

## Deployment

### Stack
| Service | Platform | Notes |
|---------|----------|-------|
| Database | MongoDB Atlas (free M0) | Cloud MongoDB |
| Backend | Render (free tier) | Node + Express + Socket.io |
| Frontend | Vercel (free) | React/Vite |

### Step 1 — MongoDB Atlas
1. Go to https://cloud.mongodb.com → Create free M0 cluster
2. Create a database user (username + password)
3. Network Access → Add IP → `0.0.0.0/0` (allow all)
4. Connect → Drivers → copy the connection string
5. Replace `<password>` with your DB user password, add `/resort-scheduler` before `?`

### Step 2 — Deploy Backend on Render
1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo: `adriananicete/resort-calendar-scheduler`
3. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Runtime:** Node
4. Environment Variables (add these):
   - `MONGODB_URI` → your Atlas connection string
   - `CLIENT_URL` → your Vercel URL (add after Step 3, or use `*` temporarily)
   - `NODE_ENV` → `production`
5. Deploy → copy the Render URL (e.g. `https://resort-scheduler-api.onrender.com`)

> ⚠️ Free tier sleeps after 15 min inactivity — first request takes ~30s to wake up

### Step 3 — Deploy Frontend on Vercel
1. Go to https://vercel.com → New Project
2. Import GitHub repo: `adriananicete/resort-calendar-scheduler`
3. Settings:
   - **Root Directory:** `client`
   - **Framework:** Vite (auto-detected)
4. Environment Variables (add these):
   - `VITE_API_URL` → `https://your-render-url.onrender.com/api`
   - `VITE_SOCKET_URL` → `https://your-render-url.onrender.com`
5. Deploy → copy the Vercel URL (e.g. `https://resort-scheduler.vercel.app`)

### Step 4 — Update Render CORS
Go back to Render → Environment → update `CLIENT_URL` to your Vercel URL → redeploy.

### Env Var Reference
See `server/.env.example` and `client/.env.example` for the full list.

## Live URLs (Production)

| Service | URL |
|---------|-----|
| Frontend (Vercel) | https://resort-calendar-scheduler.vercel.app |
| Backend (Render) | https://resort-calendar-scheduler.onrender.com |
| Health check | https://resort-calendar-scheduler.onrender.com/api/health |

### Important Production Notes
- **Render free tier** sleeps after 15 min inactivity — first request on a cold start takes ~30s
- **Vercel auto-deploy** triggers on every push to `main` — GitHub repo must stay **public** for this to work (Hobby plan limitation)
- **MongoDB URI** must include the database name: `.../resort-scheduler?appName=...` — without it, Mongoose connects but uses a default db
- **Vercel env vars** require a manual redeploy to take effect after changes — go to Deployments → latest → `...` → Redeploy
- **CORS** is set via `CLIENT_URL` on Render — must match the exact Vercel URL (no trailing slash)

## GitHub
https://github.com/adriananicete/resort-calendar-scheduler

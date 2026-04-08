# Resort Calendar Scheduler — Claude Code Guide

## Project Overview
MERN stack one-page booking calendar for a private resort. Clients fill out a booking form (left panel) and see a Google Calendar-style month view (right panel). Real-time sync via Socket.io prevents double bookings. No authentication.

## Tech Stack
- **Frontend:** React 18 (Vite) + TailwindCSS v3 + react-big-calendar + react-datepicker + react-hot-toast
- **Backend:** Node.js + Express (ESM) + Socket.io v4
- **Database:** MongoDB via Mongoose v8
- **Real-time:** Socket.io — events: `booking:created`, `booking:updated`, `booking:deleted`

## Project Structure
```
Calendar-Scheduler/
├── package.json              ← root: concurrently dev scripts
├── server/
│   ├── server.js             ← Express + Socket.io + MongoDB entry point
│   ├── models/Booking.js     ← Mongoose schema
│   ├── routes/bookings.js    ← CRUD routes + conflict-check endpoint
│   ├── utils/conflictCheck.js← MongoDB overlap query logic
│   └── middleware/validateBooking.js ← express-validator rules
└── client/
    ├── vite.config.js        ← proxy /api → localhost:5000
    ├── tailwind.config.js
    └── src/
        ├── App.jsx           ← main layout: form (40%) | calendar (60%)
        ├── components/
        │   ├── BookingForm.jsx   ← booking form with auto checkout calc
        │   ├── CalendarView.jsx  ← react-big-calendar month/week/day view
        │   └── BookingModal.jsx  ← view / edit / delete modal
        ├── hooks/
        │   ├── useBookings.js        ← fetch all + socket event listeners
        │   └── useConflictCheck.js   ← debounced live conflict check
        ├── services/api.js   ← axios instance, all API call functions
        ├── socket/socket.js  ← singleton socket.io-client
        └── utils/tourTypeHelpers.js  ← calculateCheckOut, TOUR_COLORS, ROOM_UNITS
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

## Environment Variables

`server/.env` (already created, do not commit):
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/resort-scheduler
CLIENT_URL=http://localhost:5173
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | Fetch all bookings |
| GET | `/api/bookings/conflict-check` | Live conflict check (query: roomUnit, checkIn, checkOut, excludeId?) |
| POST | `/api/bookings` | Create booking (409 if conflict) |
| PUT | `/api/bookings/:id` | Update booking (409 if conflict) |
| DELETE | `/api/bookings/:id` | Delete booking |

## MongoDB Schema (Booking)

| Field | Type | Notes |
|-------|------|-------|
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

## Tour Types & Checkout Logic

| Tour Type | Time | Checkout Calc |
|-----------|------|---------------|
| `day` | 8am – 5pm | Same day, 5:00 PM |
| `night` | 7pm – 6am | +1 day, 6:00 AM |
| `overnight` | 7pm – next 5pm | +1 day, 5:00 PM |

Logic is in `client/src/utils/tourTypeHelpers.js` → `calculateCheckOut()`.

## Calendar Color Coding

| Tour Type | Color | Hex |
|-----------|-------|-----|
| Day Tour | Amber | `#F59E0B` |
| Night Tour | Indigo | `#6366F1` |
| Overnight | Purple | `#8B5CF6` |

## Double Booking Logic

MongoDB overlap query in `server/utils/conflictCheck.js`:
```js
{ roomUnit, checkIn: { $lt: reqCheckOut }, checkOut: { $gt: reqCheckIn } }
```
- POST: no excludeId
- PUT: pass `excludeId` to avoid self-conflict

Frontend checks live via `useConflictCheck` hook (debounced 500ms). Submit is blocked if conflict is detected.

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

## GitHub
https://github.com/adriananicete/resort-calendar-scheduler

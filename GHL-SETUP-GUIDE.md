# GoHighLevel Payment Integration — Setup Guide

This guide walks you through everything you need to set up on GoHighLevel (GHL) so that your resort booking app can accept payments and automatically confirm bookings.

---

## How It Works (Big Picture)

```
User fills out booking form on your website
        ↓
Backend creates a "pending" booking (expires in 30 min)
        ↓
User gets redirected to your GHL payment page
        ↓
User pays on GHL
        ↓
GHL triggers a workflow → sends webhook to your backend
        ↓
Backend confirms the booking automatically
        ↓
User sees "Booking Confirmed!" on the success page
```

---

## Step 1: Create a GoHighLevel Order Form

1. Log in to your **GoHighLevel** sub-account
2. Go to **Sites** → **Funnels** → click **+ Create New Funnel**
3. Name it something like `Resort Booking Payment`
4. Add a **one-step funnel** with an **Order Form** element
5. Configure the order form:
   - Add a **product** (e.g., "Resort Booking" with the price, or set it as a custom amount)
   - Make sure **Email** is a required field in the form (this is how we match payments to bookings)
   - Connect your **payment gateway** (Stripe, PayPal, etc.) under **Payments** → **Integrations**
6. **Publish** the funnel
7. Copy the **published URL** — this is your `GHL_PAYMENT_URL`

> Example URL: `https://your-subdomain.clientclub.net/resort-booking-payment`

---

## Step 2: Create a Workflow (Webhook Trigger)

This is the automation that tells your backend "hey, this person just paid."

1. Go to **Automation** → **Workflows** → click **+ Create Workflow**
2. Start from scratch
3. **Set the Trigger:**
   - Search for **"Payment Received"**
   - Select it — this fires every time someone completes a payment on your order form
   - In the trigger filters, you can optionally filter to only the funnel/order form you created in Step 1

4. **Add an Action — Send Webhook:**
   - Click the **+** button after the trigger
   - Search for **"Webhook"** (under External Communication)
   - Configure it:

   | Setting | Value |
   |---------|-------|
   | **Method** | POST |
   | **URL** | `https://your-render-url.onrender.com/api/webhooks/gohighlevel` |
   | **Content Type** | application/json |

   - **Custom Body** (paste this JSON):
   ```json
   {
     "email": "{{contact.email}}",
     "payment_status": "paid",
     "amount": "{{payment.amount}}",
     "secret": "YOUR_WEBHOOK_SECRET_HERE"
   }
   ```

   > Replace `YOUR_WEBHOOK_SECRET_HERE` with a random string you create (e.g., `my-resort-secret-2026`). You'll use this same string in your backend `.env` file.

5. **Save** and **Publish** the workflow (toggle it ON)

---

## Step 3: Set Up Redirect After Payment

After the user pays, they should be redirected back to your app's success page.

1. Go back to your **Funnel** → edit the **Order Form** step
2. Look for **Thank You Page** or **Redirect URL** settings
3. Set the redirect URL to:

   ```
   https://resort-calendar-scheduler.vercel.app/booking/success/PLACEHOLDER
   ```

   > **Important:** GHL doesn't reliably pass custom query params through redirects. The success page will work by polling your backend using the bookingId from the URL. Since GHL can't dynamically insert the bookingId into the redirect URL, you have two options:

   **Option A (Simple):** Set a static redirect URL. The user will see a "Verifying payment..." screen. The webhook will have already confirmed the booking by the time they land on the page, so it should resolve quickly. You can use a URL like:
   ```
   https://resort-calendar-scheduler.vercel.app/booking/success/pending
   ```
   Then update the success page to also try matching by email if the bookingId is "pending".

   **Option B (Better):** Use a GHL **Custom Action** or **Redirect** action in the workflow to redirect with the bookingId. This requires a bit more GHL expertise.

   For now, **Option A is fine** — the webhook confirms the booking almost instantly, and the success page will detect it.

---

## Step 4: Update Your Environment Variables

### Backend (`server/.env`)

Add these lines:

```env
GHL_PAYMENT_URL=https://your-subdomain.clientclub.net/resort-booking-payment
GHL_WEBHOOK_SECRET=my-resort-secret-2026
```

| Variable | What to put |
|----------|-------------|
| `GHL_PAYMENT_URL` | The published URL of your GHL order form funnel (from Step 1) |
| `GHL_WEBHOOK_SECRET` | The same secret string you put in the webhook JSON body (from Step 2) |

### Frontend (`client/.env`)

Add this line:

```env
VITE_GHL_PAYMENT_URL=https://your-subdomain.clientclub.net/resort-booking-payment
```

> This is the same URL as the backend one. The frontend uses it to redirect the user after they submit the booking form.

### Production (Render + Vercel)

- **Render:** Go to your Web Service → Environment → add `GHL_PAYMENT_URL` and `GHL_WEBHOOK_SECRET`
- **Vercel:** Go to your Project → Settings → Environment Variables → add `VITE_GHL_PAYMENT_URL`
- **Vercel:** After adding the env var, you need to **redeploy** for it to take effect

---

## Step 5: Test the Full Flow

### Local Testing

1. Start the app locally: `npm run dev`
2. Fill out the booking form and submit
3. You should be redirected to your GHL payment page
4. Complete a test payment (use Stripe test mode if available)
5. Check your backend console — you should see:
   ```
   Booking BK-20260417-001 confirmed via GHL webhook
   ```
6. The success page should show "Booking Confirmed!"

### Testing the Webhook Manually (without GHL)

If you want to test without actually paying, you can simulate the webhook using Postman or curl:

```bash
curl -X POST http://localhost:5000/api/webhooks/gohighlevel \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "payment_status": "paid",
    "amount": 10000,
    "secret": "my-resort-secret-2026"
  }'
```

> Make sure a pending booking with that email exists first (submit a booking form without the GHL redirect, or temporarily remove the redirect in dev).

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Webhook not hitting your backend | Make sure the workflow is **published** (toggled ON). Check the URL is correct and your Render server is awake |
| "Unauthorized" response on webhook | The `secret` in the webhook JSON body doesn't match `GHL_WEBHOOK_SECRET` in your `.env` |
| "No pending booking found" in logs | The email in GHL doesn't match the email used in the booking form. Check for typos or casing issues (backend normalizes to lowercase) |
| Booking expired before payment | The 30-minute window passed. The user needs to book again. Consider increasing the window in `server/routes/bookings.js` if needed |
| Success page stuck on "Verifying..." | The webhook hasn't fired yet or failed. Check the GHL workflow execution history under Automation → Workflows → your workflow → Execution Logs |
| Redirect after payment goes to wrong page | Update the Thank You Page / Redirect URL in your GHL funnel settings |

---

## GHL Webhook Payload Reference

Your backend expects this JSON structure:

```json
{
  "email": "guest@example.com",     // REQUIRED — must match the booking form email
  "payment_status": "paid",          // REQUIRED — must be exactly "paid"
  "amount": 10000,                   // optional — for logging
  "secret": "your-secret-here"       // optional but recommended — for security
}
```

Available GHL variables you can use in the webhook body:
- `{{contact.email}}` — the payer's email
- `{{contact.first_name}}` — first name
- `{{contact.last_name}}` — last name
- `{{payment.amount}}` — payment amount
- `{{payment.currency}}` — currency code

---

## Summary Checklist

- [ ] GHL order form created and published
- [ ] Payment gateway connected (Stripe/PayPal)
- [ ] Workflow created with "Payment Received" trigger
- [ ] Webhook action added pointing to `/api/webhooks/gohighlevel`
- [ ] Webhook body includes `email`, `payment_status`, and `secret`
- [ ] Redirect URL set to your success page
- [ ] `GHL_PAYMENT_URL` added to backend `.env` and Render
- [ ] `GHL_WEBHOOK_SECRET` added to backend `.env` and Render
- [ ] `VITE_GHL_PAYMENT_URL` added to client `.env` and Vercel
- [ ] Tested the full flow end-to-end

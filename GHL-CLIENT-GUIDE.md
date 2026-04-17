# Resort Booking Payment Setup — What We Need From You

Hi! Para ma-integrate yung online payment sa booking system ng resort, kailangan namin ng tulong mo sa GoHighLevel (GHL) side. Ito yung mga steps na need mong gawin at yung mga info na need mong i-send sa developer.

---

## Ano ang mangyayari after ng setup?

1. Mag-fill out ng booking form yung guest sa website
2. Ma-redirect sya sa payment page (sa GHL)
3. Magbabayad sya dun (Stripe, PayPal, GCash, etc.)
4. Automatic na ma-coconfirm yung booking nya — walang manual na kailangan gawin

---

## Mga Kailangan Mong Gawin

### Step 1: Gumawa ng Order Form sa GHL

1. Mag-login sa **GoHighLevel** account
2. Pumunta sa **Sites** → **Funnels** → **+ Create New Funnel**
3. Pangalanan mo ng kahit ano (e.g., `Resort Booking Payment`)
4. Gumawa ng isang page na may **Order Form**
5. Sa order form:
   - Lagyan ng **product** (yung resort booking, lagay mo yung price o kung gusto mo custom amount)
   - Siguruhing may **Email** field na required — ito yung gagamitin para i-match yung payment sa booking
6. I-connect yung **payment gateway** mo (Stripe, PayPal, etc.)
   - Pumunta sa **Payments** → **Integrations** para i-setup
7. I-publish yung funnel

**I-send mo sa developer:**
> Yung **published URL** ng order form
> (Example: `https://your-subdomain.clientclub.net/resort-booking-payment`)

---

### Step 2: Gumawa ng Workflow (Automation)

Ito yung automation na mag-notify sa system kapag may nagbayad.

1. Pumunta sa **Automation** → **Workflows** → **+ Create Workflow**
2. Start from scratch
3. **Trigger:** Hanapin at piliin yung **"Payment Received"**
4. **Add Action:** Click yung **+** button, then hanapin **"Webhook"**
5. I-configure yung webhook — **hintayin mo muna yung settings na ibibigay ng developer** (URL at secret key)
6. I-save at i-publish (toggle ON) yung workflow **after** ma-configure

**Hintayin mo mula sa developer:**
> - Yung **Webhook URL** (kung saan i-point yung webhook)
> - Yung **Secret Key** (para sa security)
> - Yung **JSON body** na i-paste mo sa webhook settings

---

### Step 3: I-setup yung Redirect After Payment

Kapag nag-bayad na yung guest, need nyang ma-redirect pabalik sa website para makita yung confirmation.

1. Bumalik sa **Funnel** mo → i-edit yung **Order Form** step
2. Hanapin yung **Thank You Page** o **Redirect URL** setting
3. I-paste yung redirect URL — **ibibigay ng developer**

**Hintayin mo mula sa developer:**
> Yung **Redirect URL** para sa success page

---

## Summary: Ano ang Need Mong I-send sa Developer (Adrian)

Ito yung mga info na galing sa GHL mo na kailangan ng developer para ma-connect yung website sa payment system.

| # | Ano ang i-sesend mo | Para saan | Saan mo makukuha |
|---|---------------------|-----------|-------------------|
| 1 | **Order Form URL** (yung link ng payment page) | Para dito ma-redirect yung guest pagka-book | Sa GHL → Funnels → i-publish yung funnel → copy yung link |
| 2 | **Anong payment gateway gamit mo** (Stripe, PayPal, GCash, etc.) | Para alam ng developer kung compatible | Ikaw na nakakaalam nito |
| 3 | **GHL sub-account access** (optional) | Kung gusto mong developer na lang mag-setup ng workflow para sa'yo | Sa GHL → Settings → Team/Sub-accounts |

---

## Summary: Ano ang Ibibigay ng Developer (Adrian) Sa'yo

Ito naman yung mga info na galing sa developer na i-paste mo sa GHL workflow at funnel settings.

| # | Ano ang ibibigay sa'yo | Saan mo i-paste sa GHL | Para saan |
|---|------------------------|------------------------|-----------|
| 1 | **Backend Webhook URL** (link ng server ni developer) | Workflow → Webhook action → URL field | Para kapag may nagbayad, automatic na ma-notify yung booking system |
| 2 | **Secret Key** (password para sa security) | Workflow → Webhook action → sa loob ng JSON body | Para sure na legit yung notification, hindi gawa-gawa |
| 3 | **JSON Body template** (copy-paste ready na text) | Workflow → Webhook action → Custom Body | Ito yung format ng data na i-sesend ng GHL sa server |
| 4 | **Success Page URL** (link ng confirmation page) | Funnel → Order Form → Thank You Page / Redirect URL | Para after magbayad, ma-redirect yung guest sa confirmation page |

---

## Important Reminders

- **Yung email na ini-enter ng guest sa booking form at sa payment form DAPAT PAREHO.** Ito yung ginagamit para i-match yung bayad sa booking. Pag iba yung email, hindi ma-coconfirm yung booking.

- **Yung payment gateway mo (Stripe/PayPal) need naka-connect na sa GHL bago gamitin.** Puntahan mo yung Payments → Integrations para i-check.

- **Kapag nagbayad yung guest, may 30-minute window.** Kung hindi pa nag-bayad within 30 minutes after mag-book, automatic na macacancel yung booking at mafree-up yung slot para sa iba.

- **Kung may problem sa payments or hindi na-coconfirm yung booking,** pwede mo i-check sa GHL → Automation → Workflows → yung workflow mo → **Execution Logs** para makita kung nag-fire ba yung webhook.

---

## Kung Ayaw Mo Mag-setup ng Workflow Mismo

No problem — pwede mo na lang ibigay sa developer yung **GHL login credentials** o **sub-account access** para sya na mag-setup ng workflow at webhook. Ikaw na lang mag-setup ng:

1. Order form + product + pricing
2. Payment gateway connection

Yung technical na part (workflow, webhook, redirect), developer na ang bahala.

---

*Kapag ready ka na, i-send mo lang yung Order Form URL sa developer at simulan na natin!*

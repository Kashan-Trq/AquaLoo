# AquaLoop — Global Vercel + ESP32 MVP

This build turns AquaLoop into a **globally available multi-device web app** while keeping the ESP32 hotspot as a local fallback.

## What this version does

- Email/password **sign up and login**
- One account can manage **multiple AquaLoop devices**
- Inputs per device:
  - Arduino / device name
  - unique Device ID
  - tank capacity in litres
  - expected filter service capacity in litres
- Live outputs:
  - TDS (ppm)
  - turbidity (NTU)
  - flow rate (L/min)
  - cumulative measured volume
  - estimated tank fill progress
  - estimated time remaining
  - from-empty fill estimate = tank capacity / current flow
- Filter service states:
  - 🟢 Filter is working well
  - 🟡 Check filter
  - 🔴 Maintenance required
- Recent live graphs
- Local ESP32 hotspot and diagnostics page
- No Blynk

---

# Part A — Put the website online

## 1. Create a Supabase project

Go to Supabase and create a free project.

In the project, open **SQL Editor** and run the entire file:

`SUPABASE_SETUP.sql`

This creates the device tables, telemetry tables, access rules, and enables Realtime for the latest readings.

## 2. Get the 3 Supabase values

From your Supabase project get:

1. Project URL
2. Publishable key
3. Service role key

Keep the service role key private. Never put it in browser code or the ESP32.

## 3. Upload this project to GitHub

Create a new GitHub repository, then upload the contents of this folder.

Do **not** upload a real `.env.local` file.

## 4. Import the GitHub repository into Vercel

In Vercel:

**Add New → Project → Import your GitHub repository**

Vercel should detect **Next.js** automatically.

## 5. Add Vercel environment variables

In the Vercel project settings add:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Use the values from your Supabase project.

Then redeploy the Vercel project.

You will receive a global HTTPS address similar to:

```text
https://aqualoop.vercel.app
```

If that exact project name is unavailable, Vercel gives you another `*.vercel.app` address. You can attach a purchased custom domain later.

---

# Part B — Create your account and device

## 6. Open the deployed AquaLoop site

Choose **Create account**.

Sign up with your email and password.

If Supabase email confirmation is enabled, confirm the email first. For a very fast competition demo, you may choose to disable email confirmation in your Supabase Auth settings and re-enable it later for production.

## 7. Click “Add device”

Example:

```text
Arduino / Device name: Main Greywater Unit
Device ID: AC-PK-001
Tank capacity: 50
Filter service capacity: 500
```

The filter capacity is the estimated number of litres your chosen cartridge/media can treat before service. **500 L is only a placeholder unless you have validated that capacity experimentally.**

## 8. SAVE THE DEVICE SECRET

After creating the device, AquaLoop shows a unique secret once.

It also shows the exact three firmware lines you need:

```cpp
const char* DEVICE_ID = "AC-PK-001";
const char* DEVICE_SECRET = "...";
const char* CLOUD_ENDPOINT = "https://YOUR-VERCEL-DOMAIN/api/telemetry";
```

Copy these somewhere safe.

---

# Part C — Configure the ESP32

## 9. Open the firmware

Open:

`firmware/AquaLoop_Global_ESP32.ino`

in Arduino IDE.

## 10. Change these five values

```cpp
const char* DEVICE_ID = "AC-PK-001";
const char* DEVICE_SECRET = "PASTE_THE_SECRET_AQUALOOP_GAVE_YOU";
const char* CLOUD_ENDPOINT = "https://YOUR-VERCEL-DOMAIN/api/telemetry";

const char* HOME_WIFI_SSID = "YOUR_WIFI_NAME";
const char* HOME_WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
```

For a second device, register `AC-PK-002` on the website and flash its own ID + secret.

## 11. Confirm sensor pins

The current defaults are:

```cpp
TDS_PIN = 34
TURBIDITY_PIN = 35
FLOW_PIN = 27
```

These are starting defaults only. Confirm them against your real wiring before powering the sensors.

**Never feed more than 3.3 V into an ESP32 GPIO/ADC pin.**

## 12. Calibrate your sensors

The firmware intentionally exposes calibration constants for:

- TDS
- turbidity
- flow meter

Do not present uncalibrated sensor numbers as laboratory-validated water quality.

## 13. Upload to ESP32

After boot, open Serial Monitor at **115200 baud**.

You should see:

```text
Local hotspot: AquaLoop-AC-PK-001
Local dashboard: http://192.168.4.1
Global internet connected...
Cloud telemetry OK (200)
```

---

# Part D — Use it globally

As long as the ESP32 is connected to an internet Wi-Fi network, you can open your Vercel AquaLoop dashboard from another city/country and see that device's readings.

The global path is:

```text
ESP32 -> HTTPS -> Vercel -> Supabase -> authenticated AquaLoop dashboard
```

No Blynk is involved.

---

# Part E — Local fallback

Even when the internet fails, the ESP32 creates:

```text
AquaLoop-AC-PK-001
```

Password:

```text
AquaLoop2026
```

Connect a phone/laptop to that hotspot and open:

```text
http://192.168.4.1
```

You get a small local diagnostics dashboard with TDS, turbidity and flow.

This is especially useful for your competition demo because the physical prototype can still show sensor data even if venue internet fails.

---

# Filter status

The dashboard calculates the **usage-based filter service state** from cumulative measured water since the last service:

```text
Used % = water treated since last service / configured filter capacity × 100
```

- under 70% used → 🟢 Filter is working well
- 70–89% used → 🟡 Check filter
- 90%+ used → 🔴 Maintenance required

After physically replacing/servicing the filter, press:

**Filter replaced / serviced**

This resets the service baseline; it does not erase ESP32 lifetime flow data.

---

# Tank estimate

When the collection tank is empty, press:

**Reset as empty**

The system then uses cumulative flow to estimate tank volume and time remaining.

If the current flow is zero, the fill-time card shows `—` because a meaningful time cannot be calculated.

---

# Recommended 9-day competition approach

1. Deploy the Vercel website and prove signup/login works.
2. Register one real device: `AC-PK-001`.
3. Flash the unique device secret and Vercel endpoint to the ESP32.
4. First confirm `Cloud telemetry OK (200)` with simulated/bench sensor values.
5. Then connect the actual TDS, turbidity and flow hardware.
6. Calibrate the sensors.
7. Configure a filter capacity only after choosing a defensible test/service figure.
8. Record a stable live demo from another internet connection.
9. Keep the local hotspot ready as your venue fallback.

---

# What this MVP does NOT claim

- It does not certify water as potable.
- Filter status is not a direct chemical measurement of filter breakthrough.
- Tank level is estimated from flow, unless you later add a level sensor.
- TDS does not directly measure soap/surfactant concentration.

Those limitations are deliberate and make the competition presentation more scientifically defensible.

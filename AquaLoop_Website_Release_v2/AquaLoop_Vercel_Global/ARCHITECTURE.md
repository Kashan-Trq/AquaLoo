# AquaLoop Global Architecture

## Global path

```text
TDS sensor ──────┐
Turbidity ───────┤
Flow meter ──────┤
                 ▼
               ESP32
                 │ HTTPS every ~3 s
                 ▼
     YOUR-PROJECT.vercel.app
          /api/telemetry
                 │
                 ▼
           Supabase DB
        + Auth + Realtime
                 │
                 ▼
       AquaLoop web dashboard
     phone / laptop / anywhere
```

The ESP32 sends directly to AquaLoop's own Vercel API. There is **no Blynk**.
Supabase is used as the persistent database/authentication layer because Vercel functions are stateless.

## Local fallback path

```text
Sensors -> ESP32 -> AquaLoop-AC-PK-001 hotspot -> http://192.168.4.1
```

The ESP32 uses `WIFI_AP_STA`, so the local hotspot can remain active while the station interface connects to an internet Wi-Fi network.

## Individual devices

Every physical unit has:

- unique `DEVICE_ID`, e.g. `AC-PK-001`
- unique `DEVICE_SECRET`
- account owner
- Arduino/device display name
- tank capacity in litres
- expected filter service capacity in litres
- tank-reset baseline
- filter-service baseline

A user can add multiple units under one account. Row Level Security ensures the browser can read only devices owned by the logged-in account.

## Filter status logic (MVP)

Filter state is based on **cumulative water throughput since the last filter service/reset** relative to a configured service capacity.

- 🟢 **Filter is working well**: less than 70% capacity used
- 🟡 **Check filter**: 70–89% capacity used
- 🔴 **Maintenance required**: 90% or more capacity used

This is deliberately labelled usage-based. It should later be validated against actual cartridge/media breakthrough, turbidity/surfactant removal, pressure drop, or other performance data.

## Tank timing logic

After the user presses **Reset as empty**, the website estimates water collected as:

```text
Estimated tank volume = ESP32 lifetime total litres - tank reset baseline
```

Then:

```text
Remaining litres = Tank capacity - Estimated tank volume
Estimated time remaining = Remaining litres / Current flow rate
```

The interface also displays the simpler **from-empty estimate**:

```text
Tank capacity / Current flow rate
```

This is a flow-derived estimate, not a direct tank-level measurement.

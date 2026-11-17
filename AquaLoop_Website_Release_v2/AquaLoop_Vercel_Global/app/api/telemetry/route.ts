import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sameHash(a: string, b: string) {
  try {
    const aBuf = Buffer.from(a, "hex");
    const bBuf = Buffer.from(b, "hex");
    return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

function finiteOrNull(value: unknown, min: number, max: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export async function POST(request: Request) {
  try {
    const deviceId = (request.headers.get("x-device-id") || "").trim().toUpperCase();
    const secret = request.headers.get("x-device-secret") || "";

    if (!deviceId || !secret) {
      return NextResponse.json({ error: "Missing device credentials." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: device } = await supabase
      .from("devices")
      .select("id")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (!device) return NextResponse.json({ error: "Unknown device." }, { status: 404 });

    const { data: credentials } = await supabase
      .from("device_credentials")
      .select("secret_hash")
      .eq("device_ref", device.id)
      .maybeSingle();

    const suppliedHash = hashSecret(secret);
    if (!credentials || !sameHash(credentials.secret_hash, suppliedHash)) {
      return NextResponse.json({ error: "Invalid device secret." }, { status: 401 });
    }

    const body = await request.json();
    const tds = finiteOrNull(body.tds, 0, 100000);
    const turbidity = finiteOrNull(body.turbidity, 0, 100000);
    const flowRate = finiteOrNull(body.flowRate, 0, 10000);
    const totalLitres = finiteOrNull(body.totalLitres, 0, 1000000000) ?? 0;
    const uptimeMs = finiteOrNull(body.uptimeMs, 0, Number.MAX_SAFE_INTEGER);
    const recordHistory = Boolean(body.recordHistory);
    const now = new Date().toISOString();

    const latestPayload = {
      device_ref: device.id,
      tds,
      turbidity,
      flow_rate: flowRate,
      total_litres: totalLitres,
      sensor_timestamp: now,
      uptime_ms: uptimeMs,
    };

    const { error: latestError } = await supabase
      .from("device_latest")
      .upsert(latestPayload, { onConflict: "device_ref" });

    if (latestError) {
      console.error(latestError);
      return NextResponse.json({ error: "Unable to save latest telemetry." }, { status: 500 });
    }

    await supabase.from("devices").update({ last_seen: now }).eq("id", device.id);

    if (recordHistory) {
      await supabase.from("telemetry_history").insert(latestPayload);
    }

    return NextResponse.json({ ok: true, serverTime: now });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unexpected telemetry error." }, { status: 500 });
  }
}

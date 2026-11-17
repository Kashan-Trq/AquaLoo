import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function normalizeDeviceId(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-_]/g, "");
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await requireUser(request);
    if (!user) return NextResponse.json({ error: authError }, { status: 401 });

    const body = await request.json();
    const deviceId = normalizeDeviceId(String(body.deviceId || ""));
    const name = String(body.name || deviceId).trim().slice(0, 80);
    const tankCapacity = Number(body.tankCapacityLitres);
    const filterCapacity = Number(body.filterCapacityLitres || 500);

    if (!deviceId || deviceId.length < 3 || deviceId.length > 40) {
      return NextResponse.json({ error: "Use a Device ID between 3 and 40 characters." }, { status: 400 });
    }
    if (!Number.isFinite(tankCapacity) || tankCapacity <= 0 || tankCapacity > 100000) {
      return NextResponse.json({ error: "Tank capacity must be a positive number." }, { status: 400 });
    }
    if (!Number.isFinite(filterCapacity) || filterCapacity <= 0 || filterCapacity > 10000000) {
      return NextResponse.json({ error: "Filter capacity must be a positive number." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("devices")
      .select("id")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "That Device ID is already registered." }, { status: 409 });
    }

    const { data: device, error: insertError } = await supabase
      .from("devices")
      .insert({
        owner_id: user.id,
        device_id: deviceId,
        name: name || deviceId,
        tank_capacity_l: tankCapacity,
        filter_capacity_l: filterCapacity,
        filter_start_total_l: 0,
        tank_start_total_l: 0,
      })
      .select("*")
      .single();

    if (insertError || !device) {
      return NextResponse.json({ error: insertError?.message || "Unable to create device." }, { status: 500 });
    }

    const secret = randomBytes(24).toString("base64url");
    const secretHash = createHash("sha256").update(secret).digest("hex");

    const { error: credentialError } = await supabase
      .from("device_credentials")
      .insert({ device_ref: device.id, secret_hash: secretHash });

    if (credentialError) {
      await supabase.from("devices").delete().eq("id", device.id);
      return NextResponse.json({ error: "Unable to create device credentials." }, { status: 500 });
    }

    return NextResponse.json({ device, deviceSecret: secret }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

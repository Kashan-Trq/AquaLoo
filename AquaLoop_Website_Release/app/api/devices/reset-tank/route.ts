import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await requireUser(request);
    if (!user) return NextResponse.json({ error: authError }, { status: 401 });

    const { deviceRef } = await request.json();
    const supabase = getSupabaseAdmin();

    const { data: device } = await supabase
      .from("devices")
      .select("id, owner_id")
      .eq("id", deviceRef)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!device) return NextResponse.json({ error: "Device not found." }, { status: 404 });

    const { data: latest } = await supabase
      .from("device_latest")
      .select("total_litres")
      .eq("device_ref", device.id)
      .maybeSingle();

    const baseline = Number(latest?.total_litres || 0);
    const { error } = await supabase
      .from("devices")
      .update({ tank_start_total_l: baseline })
      .eq("id", device.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, baseline });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

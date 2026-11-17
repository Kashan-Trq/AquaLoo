"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getFilterState } from "@/lib/filter";
import type { Device, DeviceLatest, TelemetryPoint } from "@/lib/types";
import Sparkline from "./sparkline";

const supabase = getSupabaseBrowser();

function fmt(value: number | null | undefined, digits = 1) {
  return value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toFixed(digits);
}

function duration(minutes: number | null) {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.ceil(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.ceil(minutes % 60);
  return `${h}h ${m}m`;
}

export default function DashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [latest, setLatest] = useState<DeviceLatest | null>(null);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [secretResult, setSecretResult] = useState<{deviceId: string; secret: string} | null>(null);
  const [notice, setNotice] = useState("");

  const selected = devices.find((d) => d.id === selectedId) || null;

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/auth?mode=login");
        return;
      }
      setEmail(sessionData.session.user.email || "");
      const { data, error } = await supabase.from("devices").select("*").order("created_at", { ascending: true });
      if (!active) return;
      if (error) setNotice(error.message);
      const rows = (data || []) as Device[];
      setDevices(rows);
      if (rows.length) setSelectedId(rows[0].id);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!selectedId) {
      setLatest(null);
      setHistory([]);
      return;
    }

    let mounted = true;
    (async () => {
      const [{ data: latestData }, { data: historyData }] = await Promise.all([
        supabase.from("device_latest").select("*").eq("device_ref", selectedId).maybeSingle(),
        supabase.from("telemetry_history").select("*").eq("device_ref", selectedId).order("sensor_timestamp", { ascending: false }).limit(60),
      ]);
      if (!mounted) return;
      setLatest(latestData ? (latestData as DeviceLatest) : null);
      setHistory(((historyData || []) as TelemetryPoint[]).reverse());
    })();

    const channel = supabase
      .channel(`aqualoop-${selectedId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "device_latest", filter: `device_ref=eq.${selectedId}` }, (payload) => {
        const row = payload.new as DeviceLatest;
        setLatest(row);
        setHistory((prev) => [...prev.slice(-59), row]);
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [selectedId]);

  const online = useMemo(() => {
    const stamp = latest?.sensor_timestamp || selected?.last_seen;
    if (!stamp) return false;
    return Date.now() - new Date(stamp).getTime() < 20000;
  }, [selected?.last_seen, latest?.sensor_timestamp]);

  const tank = useMemo(() => {
    if (!selected) return null;
    const total = Number(latest?.total_litres || 0);
    const filled = Math.max(0, Math.min(selected.tank_capacity_l, total - Number(selected.tank_start_total_l || 0)));
    const remaining = Math.max(0, selected.tank_capacity_l - filled);
    const flow = Number(latest?.flow_rate || 0);
    const remainingMinutes = flow > 0.001 ? remaining / flow : null;
    const fromEmptyMinutes = flow > 0.001 ? selected.tank_capacity_l / flow : null;
    return {
      filled,
      remaining,
      percent: selected.tank_capacity_l > 0 ? (filled / selected.tank_capacity_l) * 100 : 0,
      remainingMinutes,
      fromEmptyMinutes,
    };
  }, [selected, latest]);

  const filter = selected ? getFilterState(Number(latest?.total_litres ?? NaN), Number(selected.filter_start_total_l || 0), Number(selected.filter_capacity_l)) : null;

  async function refreshDevices() {
    const { data } = await supabase.from("devices").select("*").order("created_at", { ascending: true });
    const rows = (data || []) as Device[];
    setDevices(rows);
    return rows;
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  async function reset(type: "tank" | "filter") {
    if (!selected) return;
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return;
    const endpoint = type === "tank" ? "/api/devices/reset-tank" : "/api/devices/reset-filter";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ deviceRef: selected.id }),
    });
    const json = await res.json();
    if (!res.ok) return setNotice(json.error || "Unable to reset.");
    const rows = await refreshDevices();
    const updated = rows.find((d) => d.id === selected.id);
    if (updated) setSelectedId(updated.id);
    setNotice(type === "tank" ? "Tank estimate reset to empty." : "Filter service counter reset after replacement/maintenance.");
  }

  if (loading) return <main className="loading-page"><div className="loader-ring" /><span>Opening AquaLoop…</span></main>;

  return (
    <main className="dashboard-shell">
      <aside className="side-panel">
        <div className="brand brand-light"><span className="brand-mark">↻</span><span>AquaLoop</span></div>
        <div className="side-title">MY DEVICES</div>
        <div className="device-list">
          {devices.map((d) => (
            <button key={d.id} className={`device-button ${selectedId === d.id ? "active" : ""}`} onClick={() => setSelectedId(d.id)}>
              <span className="device-icon">◉</span>
              <span><strong>{d.name}</strong><small>{d.device_id}</small></span>
              <i className={Date.now() - new Date(d.last_seen || 0).getTime() < 20000 ? "online" : ""} />
            </button>
          ))}
        </div>
        <button className="button add-device" onClick={() => setShowAdd(true)}>＋ Add device</button>
        <div className="side-footer"><span>{email}</span><button onClick={logout}>Log out</button></div>
      </aside>

      <section className="dashboard-main">
        <header className="dash-header">
          <div>
            <span className="eyebrow">AQUALOOP CONTROL</span>
            <h1>{selected ? selected.name : "Your devices"}</h1>
            <p>{selected ? `${selected.device_id} · ${selected.tank_capacity_l} L tank` : "Connect your first AquaLoop device."}</p>
          </div>
          {selected && <span className={`connection-pill ${online ? "live" : "offline"}`}><i />{online ? "LIVE · GLOBAL" : "OFFLINE"}</span>}
        </header>

        {notice && <div className="notice" onClick={() => setNotice("")}>{notice}<span>×</span></div>}

        {!selected ? (
          <section className="empty-state">
            <div className="empty-orbit">↻</div>
            <h2>Add your first AquaLoop unit</h2>
            <p>Each device gets its own secure Device ID, tank capacity, filter service counter and live telemetry stream.</p>
            <button className="button button-primary" onClick={() => setShowAdd(true)}>Add device</button>
          </section>
        ) : (
          <>
            <section className="status-hero">
              <div className="status-heading">
                <span className="section-kicker">LIVE WATER</span>
                <h2>Real-time recovery intelligence</h2>
                <p>Sensor values update automatically as the ESP32 reports from the installed unit.</p>
              </div>
              <div className={`filter-status ${filter?.key || "unknown"}`}>
                <div className="filter-status-top"><span>{filter?.emoji}</span><small>FILTER STATUS</small></div>
                <strong>{filter?.label}</strong>
                <div className="filter-meter"><i style={{ width: `${filter?.remainingPercent || 0}%` }} /></div>
                <p>{filter?.key === "unknown" ? "Waiting for cumulative flow data." : `${Math.round(filter?.remainingPercent || 0)}% estimated service capacity remaining · ${fmt(filter?.litresRemaining, 0)} L`}</p>
              </div>
            </section>

            <section className="metric-grid">
              <Metric title="TDS" value={fmt(latest?.tds, 0)} unit="ppm" note="Continuous sensor reading" />
              <Metric title="Turbidity" value={fmt(latest?.turbidity, 1)} unit="NTU" note="Continuous sensor reading" />
              <Metric title="Flow rate" value={fmt(latest?.flow_rate, 2)} unit="L/min" note="Current measured flow" />
              <Metric title="Est. fill time" value={duration(tank?.remainingMinutes ?? null)} unit="" note={`From empty now: ${duration(tank?.fromEmptyMinutes ?? null)}`} />
            </section>

            <section className="lower-grid">
              <article className="panel tank-panel">
                <div className="panel-head"><div><span className="section-kicker">TANK</span><h3>Fill progress</h3></div><button className="small-button" onClick={() => reset("tank")}>Reset as empty</button></div>
                <div className="tank-layout">
                  <div className="tank-gauge" style={{ "--level": `${Math.max(0, Math.min(100, tank?.percent || 0))}%` } as CSSProperties}>
                    <div className="tank-fill" /><div className="tank-label"><strong>{Math.round(tank?.percent || 0)}%</strong><span>estimated</span></div>
                  </div>
                  <dl className="detail-list">
                    <div><dt>Capacity</dt><dd>{fmt(selected.tank_capacity_l, 0)} L</dd></div>
                    <div><dt>Estimated volume</dt><dd>{fmt(tank?.filled, 1)} L</dd></div>
                    <div><dt>Remaining</dt><dd>{fmt(tank?.remaining, 1)} L</dd></div>
                    <div><dt>Time remaining</dt><dd>{duration(tank?.remainingMinutes ?? null)}</dd></div>
                  </dl>
                </div>
                <p className="fine-print">Tank level is estimated by integrating measured flow since the last “Reset as empty”. It is not a direct level-sensor measurement.</p>
              </article>

              <article className="panel history-panel">
                <div className="panel-head"><div><span className="section-kicker">LIVE TRACE</span><h3>Recent telemetry</h3></div><span className="history-count">{history.length} points</span></div>
                <div className="chart-stack">
                  <ChartRow label="TDS" value={`${fmt(latest?.tds, 0)} ppm`} values={history.map((x) => Number(x.tds || 0))} />
                  <ChartRow label="Turbidity" value={`${fmt(latest?.turbidity, 1)} NTU`} values={history.map((x) => Number(x.turbidity || 0))} />
                  <ChartRow label="Flow" value={`${fmt(latest?.flow_rate, 2)} L/min`} values={history.map((x) => Number(x.flow_rate || 0))} />
                </div>
              </article>
            </section>

            <section className="panel filter-detail">
              <div className="panel-head"><div><span className="section-kicker">SERVICE</span><h3>Filter maintenance</h3></div><button className="small-button" onClick={() => reset("filter")}>Filter replaced / serviced</button></div>
              <div className="filter-legend">
                <div className="legend-item good"><b>🟢</b><span><strong>Filter is working well</strong><small>Less than 70% of configured service capacity used</small></span></div>
                <div className="legend-item check"><b>🟡</b><span><strong>Check filter</strong><small>70–89% of configured service capacity used</small></span></div>
                <div className="legend-item maintenance"><b>🔴</b><span><strong>Maintenance required</strong><small>90% or more of configured service capacity used</small></span></div>
              </div>
              <p className="fine-print">This MVP status is usage-based. Configure the expected filter service capacity for the actual cartridge/media and validate it experimentally; it does not by itself prove water-quality performance.</p>
            </section>
          </>
        )}
      </section>

      {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} onCreated={async (deviceId, secret) => { const rows = await refreshDevices(); const d = rows.find((x) => x.device_id === deviceId); if (d) setSelectedId(d.id); setShowAdd(false); setSecretResult({ deviceId, secret }); }} />}
      {secretResult && <SecretModal result={secretResult} onClose={() => setSecretResult(null)} />}
    </main>
  );
}

function Metric({ title, value, unit, note }: { title: string; value: string; unit: string; note: string }) {
  return <article className="metric-card"><span>{title}</span><div><strong>{value}</strong>{unit && <b>{unit}</b>}</div><small>{note}</small></article>;
}

function ChartRow({ label, value, values }: { label: string; value: string; values: number[] }) {
  return <div className="chart-row"><div className="chart-meta"><span>{label}</span><strong>{value}</strong></div><Sparkline values={values} /></div>;
}

function AddDeviceModal({ onClose, onCreated }: { onClose: () => void; onCreated: (deviceId: string, secret: string) => void }) {
  const [name, setName] = useState("");
  const [deviceId, setDeviceId] = useState("AC-PK-001");
  const [tank, setTank] = useState("50");
  const [filterCapacity, setFilterCapacity] = useState("500");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setError("Please log in again."); setBusy(false); return; }
    const res = await fetch("/api/devices/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ deviceId, name: name || deviceId, tankCapacityLitres: Number(tank), filterCapacityLitres: Number(filterCapacity) }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error || "Unable to add device."); setBusy(false); return; }
    onCreated(json.device.device_id, json.deviceSecret);
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
    <div className="modal-head"><div><span className="section-kicker">NEW DEVICE</span><h2>Add AquaLoop unit</h2></div><button type="button" onClick={onClose}>×</button></div>
    <label className="form-field"><span>Arduino / Device name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home Greywater Unit" /></label>
    <label className="form-field"><span>Device ID</span><input value={deviceId} onChange={(e) => setDeviceId(e.target.value.toUpperCase())} placeholder="AC-PK-001" required /></label>
    <div className="form-two"><label className="form-field"><span>Tank capacity (L)</span><input type="number" min="1" step="0.1" value={tank} onChange={(e) => setTank(e.target.value)} required /></label><label className="form-field"><span>Filter service capacity (L)</span><input type="number" min="1" step="1" value={filterCapacity} onChange={(e) => setFilterCapacity(e.target.value)} required /></label></div>
    <p className="field-help">Filter status uses the configured service capacity: green &lt;70% used, yellow 70–89%, red ≥90%.</p>
    {error && <div className="form-message error-text">{error}</div>}
    <button className="button button-primary full" disabled={busy}>{busy ? "Creating…" : "Create secure device"}</button>
  </form></div>;
}

function SecretModal({ result, onClose }: { result: {deviceId: string; secret: string}; onClose: () => void }) {
  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/telemetry` : "https://YOUR-VERCEL-DOMAIN/api/telemetry";
  return <div className="modal-backdrop"><div className="modal secret-modal">
    <div className="modal-head"><div><span className="section-kicker">DEVICE CREATED</span><h2>Save this device secret</h2></div></div>
    <p className="modal-copy">AquaLoop shows this secret once. Put it in the ESP32 firmware for <strong>{result.deviceId}</strong>.</p>
    <label className="code-field"><span>DEVICE SECRET</span><code>{result.secret}</code></label>
    <label className="code-field"><span>CLOUD ENDPOINT</span><code>{endpoint}</code></label>
    <div className="code-block">{`const char* DEVICE_ID = "${result.deviceId}";\nconst char* DEVICE_SECRET = "${result.secret}";\nconst char* CLOUD_ENDPOINT = "${endpoint}";`}</div>
    <button className="button button-primary full" onClick={onClose}>I saved it</button>
  </div></div>;
}

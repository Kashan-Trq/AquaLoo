export type Device = {
  id: string;
  owner_id: string;
  device_id: string;
  name: string;
  tank_capacity_l: number;
  filter_capacity_l: number;
  filter_start_total_l: number;
  tank_start_total_l: number;
  last_seen: string | null;
  created_at: string;
};

export type DeviceLatest = {
  device_ref: string;
  tds: number | null;
  turbidity: number | null;
  flow_rate: number | null;
  total_litres: number;
  sensor_timestamp: string;
  uptime_ms: number | null;
};

export type TelemetryPoint = {
  id?: number;
  device_ref: string;
  tds: number | null;
  turbidity: number | null;
  flow_rate: number | null;
  total_litres: number;
  sensor_timestamp: string;
};

export type FilterState = {
  key: "good" | "check" | "maintenance" | "unknown";
  label: string;
  emoji: string;
  usedPercent: number;
  remainingPercent: number;
  litresRemaining: number;
};

"use client";

export default function Sparkline({ values, min = 0, max }: { values: number[]; min?: number; max?: number }) {
  const width = 320;
  const height = 96;
  if (!values.length) return <div className="empty-chart">Waiting for data…</div>;
  const hi = max ?? Math.max(...values, min + 1);
  const lo = Math.min(min, ...values);
  const span = Math.max(hi - lo, 1);
  const points = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width;
    const y = height - ((v - lo) / span) * (height - 12) - 6;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img">
      <line x1="0" y1={height - 1} x2={width} y2={height - 1} className="chart-baseline" />
      <polyline points={points} fill="none" className="chart-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

import { formatNumber } from "@/lib/format";

export function BarList({
  rows,
  min = 0,
  max,
  digits = 1,
}: {
  rows: Array<{ name: string; value: number; display?: string }>;
  min?: number;
  max?: number;
  digits?: number;
}) {
  const ceiling = max ?? Math.max(...rows.map((row) => row.value), 1);

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No data available for this filter.</p>;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const ratio = Math.max(0, Math.min(1, (row.value - min) / (ceiling - min || 1)));
        return (
          <div key={row.name} className="grid grid-cols-[minmax(92px,140px)_1fr_56px] items-center gap-3 text-sm">
            <div className="font-semibold leading-tight">{row.name}</div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-secondary" style={{ width: `${ratio * 100}%` }} />
            </div>
            <div className="text-right font-bold">{row.display ?? formatNumber(row.value, digits)}</div>
          </div>
        );
      })}
    </div>
  );
}

export function TrendChart({ rows }: { rows: Array<{ month: string; score: number }> }) {
  const width = 640;
  const height = 242;
  const pad = { top: 18, right: 22, bottom: 34, left: 42 };
  const min = 70;
  const max = 100;
  const xStep = rows.length > 1 ? (width - pad.left - pad.right) / (rows.length - 1) : 0;
  const y = (score: number) => pad.top + (1 - (score - min) / (max - min)) * (height - pad.top - pad.bottom);
  const points = rows.map((item, index) => ({
    x: pad.left + index * xStep,
    y: y(item.score),
    ...item,
  }));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = points.length
    ? `${path} L ${points[points.length - 1].x} ${height - pad.bottom} L ${points[0].x} ${height - pad.bottom} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-60 w-full overflow-visible" preserveAspectRatio="none" aria-label="Brand composite trend">
      {[70, 80, 90, 100].map((tick) => {
        const yy = y(tick);
        return (
          <g key={tick}>
            <line x1={pad.left} y1={yy} x2={width - pad.right} y2={yy} stroke="#e4dce4" strokeWidth="1" />
            <text x="8" y={yy + 4} fill="#68707c" fontSize="12">
              {tick}
            </text>
          </g>
        );
      })}
      <path d={area} fill="rgba(157, 15, 99, 0.10)" />
      <path d={path} fill="none" stroke="#9d0f63" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <circle key={point.month} cx={point.x} cy={point.y} r={index === points.length - 1 ? 5 : 4} fill={index === points.length - 1 ? "#005a9c" : "#9d0f63"} />
      ))}
      {points.map((point) => (
        <text key={`${point.month}-label`} x={point.x} y={height - 10} textAnchor="middle" fill="#68707c" fontSize="12">
          {point.month}
        </text>
      ))}
    </svg>
  );
}

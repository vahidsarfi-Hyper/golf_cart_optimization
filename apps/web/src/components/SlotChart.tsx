import { useId } from "react";

export type ChartSeries = {
  name: string;
  color: string;
  values: number[];
};

const WIDTH = 720;
const HEIGHT = 240;
const PAD = { left: 44, right: 16, top: 16, bottom: 32 };

function tick(value: number): string {
  if (Math.abs(value) >= 100) return Math.round(value).toString();
  return (Math.round(value * 10) / 10).toString();
}

export function SlotChart({
  labels,
  series,
  selected,
  onSelect,
  marks,
  guide
}: {
  labels: string[];
  series: ChartSeries[];
  selected: number;
  onSelect: (index: number) => void;
  marks?: boolean[];
  guide?: { seriesIndex: number; value: number; label: string };
}) {
  const titleId = useId();
  const count = labels.length;
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;

  function xAt(index: number): number {
    if (count <= 1) return PAD.left;
    return PAD.left + (index / (count - 1)) * innerWidth;
  }

  function yAt(value: number, min: number, max: number): number {
    const span = max - min || 1;
    return PAD.top + (1 - (value - min) / span) * innerHeight;
  }

  function indexFromClientX(clientX: number, width: number): number {
    const ratio = clientX / width;
    const x = ratio * WIDTH;
    const t = (x - PAD.left) / innerWidth;
    return Math.max(0, Math.min(count - 1, Math.round(t * (count - 1))));
  }

  const scales = series.map((item) => {
    const max = Math.max(0, ...item.values, guide && series[guide.seriesIndex] === item ? guide.value : 0);
    return { min: 0, max: max === 0 ? 1 : max };
  });

  const axis = scales[0] ?? { min: 0, max: 1 };
  const mid = (axis.min + axis.max) / 2;
  const labelIndexes = count > 8 ? [0, Math.floor((count - 1) / 2), count - 1] : labels.map((_, index) => index);

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="group"
        aria-labelledby={titleId}
        tabIndex={0}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          onSelect(indexFromClientX(event.clientX - rect.left, rect.width));
        }}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          onSelect(indexFromClientX(event.clientX - rect.left, rect.width));
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") onSelect(Math.min(count - 1, selected + 1));
          if (event.key === "ArrowLeft") onSelect(Math.max(0, selected - 1));
        }}
      >
        <title id={titleId}>{series.map((item) => item.name).join(", ")}</title>
        {[axis.min, mid, axis.max].map((value) => (
          <g key={value}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yAt(value, axis.min, axis.max)}
              y2={yAt(value, axis.min, axis.max)}
              stroke="#d5e0d2"
            />
            <text x={PAD.left - 8} y={yAt(value, axis.min, axis.max) + 4} textAnchor="end" fontSize="11" fill="#5c6b5e">
              {tick(value)}
            </text>
          </g>
        ))}
        {guide && scales[guide.seriesIndex] && (
          <g>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yAt(guide.value, scales[guide.seriesIndex].min, scales[guide.seriesIndex].max)}
              y2={yAt(guide.value, scales[guide.seriesIndex].min, scales[guide.seriesIndex].max)}
              stroke="#b42318"
              strokeDasharray="4 4"
            />
            <text
              x={WIDTH - PAD.right}
              y={yAt(guide.value, scales[guide.seriesIndex].min, scales[guide.seriesIndex].max) - 4}
              textAnchor="end"
              fontSize="11"
              fill="#b42318"
            >
              {guide.label}
            </text>
          </g>
        )}
        {series.map((item, seriesIndex) => {
          const scale = scales[seriesIndex];
          const points = item.values
            .map((value, index) => `${xAt(index)},${yAt(value, scale.min, scale.max)}`)
            .join(" ");
          return <polyline key={item.name} fill="none" stroke={item.color} strokeWidth="2.5" points={points} />;
        })}
        {marks?.map((marked, index) => {
          if (!marked || !series[0]) return null;
          const scale = scales[0];
          return (
            <circle
              key={index}
              cx={xAt(index)}
              cy={yAt(series[0].values[index] ?? 0, scale.min, scale.max)}
              r="3.2"
              fill="#b42318"
            />
          );
        })}
        {labels[selected] !== undefined && (
          <line x1={xAt(selected)} x2={xAt(selected)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="#1c2a1d" strokeDasharray="3 3" />
        )}
        {labelIndexes.map((index) => (
          <text key={labels[index] ?? index} x={xAt(index)} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fill="#5c6b5e">
            {labels[index]}
          </text>
        ))}
      </svg>
      <div className="legend">
        {series.map((item) => (
          <span key={item.name}>
            <i className="swatch" style={{ background: item.color }} />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

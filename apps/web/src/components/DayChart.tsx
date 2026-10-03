import type { DayPayload, Policy } from "../model";

const TARGET = 250;

export function DayChart({
  day,
  policy,
  step,
  onStep,
  compare
}: {
  day: DayPayload;
  policy: Policy;
  step: number;
  onStep: (step: number) => void;
  compare?: boolean;
}) {
  const width = 760;
  const height = 250;
  const left = 46;
  const right = 12;
  const top = 16;
  const bottom = 28;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const max = 460;
  const x = (index: number) => left + (index / (day.steps.length - 1)) * innerW;
  const y = (value: number) => top + innerH - (value / max) * innerH;
  const side = (index: number) => day.steps[index][policy];
  const area = (pick: (index: number) => number) => {
    const topEdge = day.steps.map((_, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(pick(index)).toFixed(1)}`);
    return `${topEdge.join(" ")} L${x(day.steps.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  };
  const line = (pick: (index: number) => number) => day.steps.map((_, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(pick(index)).toFixed(1)}`).join(" ");
  const stack = (index: number, key: "irr" | "club" | "charge") => {
    const irr = day.meter === "one" ? day.steps[index].irrigationKw : 0;
    const club = irr + day.steps[index].clubhouseKw;
    const charge = club + side(index).chargeKw;
    if (key === "irr") return irr;
    if (key === "club") return club;
    return charge;
  };

  return (
    <svg
      className="day-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Site power from midnight to midnight"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;
        const svgX = ratio * width;
        const index = Math.round(((svgX - left) / innerW) * (day.steps.length - 1));
        onStep(Math.max(0, Math.min(day.steps.length - 1, index)));
      }}
    >
      <rect x={x(28)} width={x(44) - x(28)} y={top} height={innerH} fill="#dce8d4" />
      <rect x={x(48)} width={x(64) - x(48)} y={top} height={innerH} fill="#dce8d4" />
      {[0, 100, 200, 300, 400].map((tick) => (
        <g key={tick}>
          <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#d5e0d2" />
          <text x={left - 6} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#5c6b5e">
            {tick}
          </text>
        </g>
      ))}
      <path d={area((index) => stack(index, "charge"))} fill="#e7c98a" />
      <path d={area((index) => stack(index, "club"))} fill="#9bb7d4" />
      {day.meter === "one" ? <path d={area((index) => stack(index, "irr"))} fill="#7d9a78" /> : null}
      <path d={line((index) => day.steps[index].solarKw)} fill="none" stroke="#c4552a" strokeWidth="1.6" />
      <path d={line((index) => side(index).importKw)} fill="none" stroke="#1e4a28" strokeWidth="2.2" />
      {compare ? <path d={line((index) => day.steps[index][policy === "plan" ? "unmanaged" : "plan"].importKw)} fill="none" stroke="#b42318" strokeWidth="1.6" strokeDasharray="4 3" /> : null}
      <line x1={left} x2={width - right} y1={y(TARGET)} y2={y(TARGET)} stroke="#b45309" strokeDasharray="5 4" />
      <text x={width - right} y={y(TARGET) - 4} textAnchor="end" fontSize="11" fill="#b45309">
        Anytime target 250 kW
      </text>
      <line x1={x(step)} x2={x(step)} y1={top} y2={top + innerH} stroke="#1c2a1d" />
      <text x={left} y={height - 8} fontSize="11" fill="#5c6b5e">
        12 AM
      </text>
      <text x={x(48)} y={height - 8} fontSize="11" fill="#5c6b5e">
        12 PM
      </text>
      <text x={width - right} y={height - 8} textAnchor="end" fontSize="11" fill="#5c6b5e">
        kW
      </text>
    </svg>
  );
}

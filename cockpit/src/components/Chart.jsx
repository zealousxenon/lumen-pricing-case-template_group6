// Small inline-SVG chart primitives. No chart library: the shapes we need are
// simple, and a dependency would be more code than this file.

export function scale(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  return (v) => (d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));
}

export function Axis({ x, y, w, h, xTicks, yTicks, xFmt, yFmt, xLabel, yLabel }) {
  return (
    <g className="axis">
      <line x1={x} y1={y + h} x2={x + w} y2={y + h} />
      <line x1={x} y1={y} x2={x} y2={y + h} />
      {xTicks.map((t) => (
        <g key={t.v} transform={`translate(${t.at},${y + h})`}>
          <line y2="5" />
          <text y="18" textAnchor="middle">{xFmt(t.v)}</text>
        </g>
      ))}
      {yTicks.map((t) => (
        <g key={t.v} transform={`translate(${x},${t.at})`}>
          <line x2="-5" />
          <line className="grid" x2={w} />
          <text x="-9" dy="0.32em" textAnchor="end">{yFmt(t.v)}</text>
        </g>
      ))}
      {xLabel ? (
        <text className="axis-label" x={x + w / 2} y={y + h + 40} textAnchor="middle">
          {xLabel}
        </text>
      ) : null}
      {yLabel ? (
        <text
          className="axis-label"
          transform={`translate(${x - 48},${y + h / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          {yLabel}
        </text>
      ) : null}
    </g>
  );
}

export function ticks(d0, d1, n) {
  const step = (d1 - d0) / n;
  return Array.from({ length: n + 1 }, (_, i) => d0 + i * step);
}

// Round tick values to human numbers (1, 2, 2.5 or 5 x a power of ten) and
// return only the ones that actually fall inside the domain.
export function niceTicks(d0, d1, target = 5) {
  const span = d1 - d0;
  if (span <= 0) return [d0];
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s2) => s2 >= raw) ?? mag * 10;
  const out = [];
  for (let v = Math.ceil(d0 / step) * step; v <= d1 + step * 1e-9; v += step) {
    out.push(Math.round(v / step) * step);
  }
  return out;
}

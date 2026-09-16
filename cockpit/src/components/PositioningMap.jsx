import { competitorShelfRange, fmtEur } from "../model.js";

// Competitor shelf prices on one axis, with LUMEN's chosen price on top.
// The gap between Mate Libre and VoltFit is the whole positioning argument,
// so the chart's job is to make that gap impossible to miss.
export default function PositioningMap({ price }) {
  const comps = competitorShelfRange();
  const W = 720;
  const H = 232;
  const L = 40;
  const R = 40;
  const w = W - L - R;
  const lo = 0.8;
  const hi = 3.3;
  const x = (v) => L + ((v - lo) / (hi - lo)) * w;

  const gapLow = comps.find((c) => c.name === "Mate Libre")?.retail ?? 1.59;
  const gapHigh = comps.find((c) => c.name === "VoltFit")?.retail ?? 2.37;
  const inGap = price > gapLow && price < gapHigh;

  return (
    <figure className="chart">
      <div
        className="chart-scroll"
        role="region"
        aria-label="Scrollable competitor price chart"
        tabIndex="0"
      >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Competitor shelf prices and LUMEN's chosen price">
        <rect
          className="gap"
          x={x(gapLow)}
          y={102}
          width={x(gapHigh) - x(gapLow)}
          height={58}
        />
        <text className="gap-label" x={(x(gapLow) + x(gapHigh)) / 2} y={94} textAnchor="middle">
          nobody on the shelf between {fmtEur(gapLow)} and {fmtEur(gapHigh)}
        </text>

        <line className="axis-line" x1={L} x2={L + w} y1={160} y2={160} />
        {[1.0, 1.5, 2.0, 2.5, 3.0].map((v) => (
          <g key={v} transform={`translate(${x(v)},160)`}>
            <line className="axis-line" y2="6" />
            <text className="tick" y="22" textAnchor="middle">{`€${v.toFixed(2)}`}</text>
          </g>
        ))}

        {comps.map((c, i) => (
          <g key={c.name} transform={`translate(${x(c.retail)},160)`}>
            <circle className="comp-dot" r={4 + (c.spendIndex / 100) * 6} cy="0" />
            <text
              className="comp-name"
              y={i % 2 ? 46 : 40}
              textAnchor="middle"
            >
              {c.name}
            </text>
            <text className="comp-price" y={i % 2 ? 60 : 54} textAnchor="middle">
              {fmtEur(c.retail)}
            </text>
          </g>
        ))}

        <g transform={`translate(${x(price)},160)`}>
          <line className="lumen-stem" y1="0" y2="-90" />
          <circle className="lumen-dot" cy="-90" r="7" />
          <text className="lumen-label" y="-104" textAnchor="middle">
            LUMEN {fmtEur(price)}
          </text>
        </g>
      </svg>
      </div>
      <figcaption>
        <p>
          Dot size is each brand&apos;s marketing spend index. PulsUp outspends
          everyone at the bottom of the market; Root &amp; Rise sits at the top on
          almost no spend.{" "}
          {inGap
            ? "At this price LUMEN owns the empty shelf between the heritage brand and the premium performance brand — priced above the value fight, below the brand LUMEN cannot outspend."
            : "At this price LUMEN is shoulder to shoulder with an established brand rather than in the gap, which means winning on brand against someone who got there first."}
        </p>
      </figcaption>
    </figure>
  );
}

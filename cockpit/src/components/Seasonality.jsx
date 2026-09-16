import { seasonality } from "../model.js";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Seasonality({ launchMonth, onPick }) {
  const W = 720;
  const H = 210;
  const M = { t: 18, r: 16, b: 42, l: 44 };
  const w = W - M.l - M.r;
  const h = H - M.t - M.b;
  const max = Math.max(...seasonality.map((d) => d.index));
  const bw = w / 12;

  return (
    <figure className="chart">
      <div
        className="chart-scroll"
        role="region"
        aria-label="Scrollable monthly seasonality chart"
        tabIndex="0"
      >
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Interactive monthly demand seasonality index for Germany">
        {[80, 100, 120, 140].map((v) => (
          <g key={v} transform={`translate(0,${M.t + h - (v / max) * h})`}>
            <line className="grid" x1={M.l} x2={M.l + w} />
            <text className="tick" x={M.l - 8} dy="0.32em" textAnchor="end">{v}</text>
          </g>
        ))}
        {seasonality.map((d, i) => {
          const bh = (d.index / max) * h;
          const on = d.month === launchMonth;
          const peak = d.index >= 118;
          return (
            <g
              key={d.month}
              role="button"
              tabIndex="0"
              aria-label={`Select ${MONTHS[i]}: demand index ${d.index}, average temperature ${d.temp} degrees`}
              aria-pressed={on}
              onClick={() => onPick?.(d.month)}
              onKeyDown={(event) => {
                if (["Enter", " "].includes(event.key)) {
                  event.preventDefault();
                  onPick?.(d.month);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <rect
                className={`bar${on ? " is-on" : peak ? " is-peak" : ""}`}
                x={M.l + i * bw + bw * 0.16}
                y={M.t + h - bh}
                width={bw * 0.68}
                height={bh}
              />
              <text
                className={`tick${on ? " is-on" : ""}`}
                x={M.l + i * bw + bw / 2}
                y={M.t + h + 16}
                textAnchor="middle"
              >
                {MONTHS[i]}
              </text>
              <text className="tick tiny" x={M.l + i * bw + bw / 2} y={M.t + h + 30} textAnchor="middle">
                {d.temp}°
              </text>
            </g>
          );
        })}
      </svg>
      </div>
      <figcaption>
        <p>
          Demand runs 78 in January and 138 in July — a 77% swing. Selecting one
          of the stronger months means the first weeks of sell-through, the ones the
          retail buyer and the gym manager will judge the brand on, land on the
          strongest demand of the year rather than the weakest. This chart changes
          the timing comparison only; it does not multiply the annual forecast.
          Click a month to set the launch.
        </p>
      </figcaption>
    </figure>
  );
}

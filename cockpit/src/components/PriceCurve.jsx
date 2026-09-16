import { useMemo } from "react";
import { MODEL_LIMITS, runScenario, fmtEur, fmtEur0 } from "../model.js";
import { Axis, scale, ticks, niceTicks } from "./Chart.jsx";

const [MIN_PRICE, MAX_PRICE] = MODEL_LIMITS.price;
const PRICE_STEP = 0.05;
const snapPrice = (value) =>
  Math.round(
    (MIN_PRICE + Math.round((value - MIN_PRICE) / PRICE_STEP) * PRICE_STEP) * 100,
  ) / 100;

// Year-one contribution net of marketing, swept across price, under both views
// of CAC. The point of the chart is the gap between the two lines: if CAC is
// immune to price, charge more; if it is not, the observed-data kink exposes a
// best point but does not prove the rollout is viable.
export default function PriceCurve({ price, mix, budget, region, onPick }) {
  const W = 720;
  const H = 320;
  const M = { t: 16, r: 20, b: 56, l: 76 };
  const w = W - M.l - M.r;
  const h = H - M.t - M.b;

  const series = useMemo(() => {
    const prices = [];
    for (let p = MIN_PRICE; p <= MAX_PRICE + 0.001; p += 0.02) {
      prices.push(Math.round(p * 100) / 100);
    }
    const opt = prices.map((p) => ({
      p,
      v: runScenario({ price: p, mix, budget, region, cacElasticity: 0 }).totals
        .netOfMarketing,
    }));
    const con = prices.map((p) => ({
      p,
      v: runScenario({ price: p, mix, budget, region, cacElasticity: 1 }).totals
        .netOfMarketing,
    }));
    return { opt, con, prices };
  }, [mix, budget, region]);

  const all = [...series.opt, ...series.con].map((d) => d.v);
  const y0 = Math.min(0, Math.min(...all));
  const y1 = Math.max(...all);
  const pad = (y1 - y0) * 0.08 || 1;
  const sx = scale([MIN_PRICE, MAX_PRICE], [M.l, M.l + w]);
  const sy = scale([y0 - pad, y1 + pad], [M.t + h, M.t]);

  const path = (d) => d.map((pt, i) => `${i ? "L" : "M"}${sx(pt.p)},${sy(pt.v)}`).join("");
  const peak = (d) => d.reduce((a, b) => (b.v > a.v ? b : a));
  const peakCon = peak(series.con);
  const peakOpt = peak(series.opt);
  const plateau = series.con.filter((point) => point.p >= 2 && point.p <= 2.2);
  const neighbourhoodSpread =
    Math.max(...plateau.map((point) => point.v)) -
    Math.min(...plateau.map((point) => point.v));

  return (
    <figure className="chart">
      <div
        className="chart-scroll"
        role="region"
        aria-label="Scrollable price scenario chart"
        tabIndex="0"
      >
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Interactive year-one contribution net of marketing by launch price">
        <Axis
          x={M.l}
          y={M.t}
          w={w}
          h={h}
          xTicks={ticks(MIN_PRICE, MAX_PRICE, 6).map((v) => ({ v, at: sx(v) }))}
          yTicks={niceTicks(y0 - pad, y1 + pad, 5).map((v) => ({ v, at: sy(v) }))}
          xFmt={(v) => `€${v.toFixed(2)}`}
          yFmt={(v) => (v === 0 ? "€0" : `${v < 0 ? "−" : ""}€${Math.abs(Math.round(v / 1000))}k`)}
          xLabel="Launch price, single 330ml can"
          yLabel="Year-1 contribution net of marketing"
        />
        {y0 < 0 && y1 > 0 ? (
          <line className="zero" x1={M.l} x2={M.l + w} y1={sy(0)} y2={sy(0)} />
        ) : null}

        <path className="line line-opt" d={path(series.opt)} />
        <path className="line line-con" d={path(series.con)} />

        <circle className="peak peak-con" cx={sx(peakCon.p)} cy={sy(peakCon.v)} r="5" />
        <circle className="peak peak-opt" cx={sx(peakOpt.p)} cy={sy(peakOpt.v)} r="5" />

        <line className="marker" x1={sx(price)} x2={sx(price)} y1={M.t} y2={M.t + h} />
        <text className="marker-label" x={sx(price)} y={M.t - 3} textAnchor="middle">
          {fmtEur(price)}
        </text>

        <rect
          x={M.l}
          y={M.t}
          width={w}
          height={h}
          fill="transparent"
          style={{ cursor: "crosshair" }}
          role="slider"
          tabIndex="0"
          aria-label="Launch price selected on chart"
          aria-valuemin={MIN_PRICE}
          aria-valuemax={MAX_PRICE}
          aria-valuenow={price}
          aria-valuetext={fmtEur(price)}
          onClick={(e) => {
            if (!onPick) return;
            const box = e.currentTarget.getBoundingClientRect();
            const rel = (e.clientX - box.left) / box.width;
            const p = MIN_PRICE + rel * (MAX_PRICE - MIN_PRICE);
            onPick(snapPrice(p));
          }}
          onKeyDown={(e) => {
            if (!onPick || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
            e.preventDefault();
            const direction = e.key === "ArrowRight" ? 1 : -1;
            onPick(
              Math.min(MAX_PRICE, Math.max(MIN_PRICE, snapPrice(price + direction * PRICE_STEP))),
            );
          }}
        />
      </svg>
      </div>
      <figcaption>
        <span className="key key-opt">CAC holds at the level the data room reports</span>
        <span className="key key-con">CAC rises as fewer people accept the price</span>
        <p>
          The dashed line has no peak. If the cost of winning a customer really is
          independent of what you charge them, the model says charge more, forever
          — it runs off the top of the chart at {fmtEur(3.09)} and would keep
          going. That is not a recommendation, it is a sign the assumption is
          doing all the work.
        </p>
        <p>
          The solid line is the same calculation with one change: a customer is
          harder to win when fewer people accept the price. Its best point is{" "}
          {fmtEur(peakCon.p)}, yet it still produces {fmtEur0(peakCon.v)}. Across
          €2.00–€2.20 the result moves by {fmtEur0(neighbourhoodSpread)}, so the
          kink ranks the tested hypotheses but cannot justify false precision or
          a full rollout. Click the chart, or focus it and use the arrow keys, to
          move the price.
        </p>
      </figcaption>
    </figure>
  );
}

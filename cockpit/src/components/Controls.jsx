import { CHANNELS, MODEL_LIMITS, fmtEur, fmtEur0, fmtPct } from "../model.js";

export default function Controls({ state, set }) {
  const { price, mix, budget, region, cacElasticity, retentionMonths } = state;
  const mixTotal = CHANNELS.reduce((s, c) => s + mix[c], 0);
  const updateMix = (selected, nextPercent) => {
    const selectedWeight = nextPercent / 100;
    const others = CHANNELS.filter((channel) => channel !== selected);
    const othersTotal = others.reduce((total, channel) => total + mix[channel], 0);
    const nextMix = { ...mix, [selected]: selectedWeight };
    for (const channel of others) {
      nextMix[channel] =
        othersTotal > 0
          ? (mix[channel] / othersTotal) * (1 - selectedWeight)
          : (1 - selectedWeight) / others.length;
    }
    set({ mix: nextMix });
  };

  return (
    <aside className="controls" aria-label="Scenario assumptions">
      <div className="control">
        <label htmlFor="price-input">
          Launch price <strong>{fmtEur(price)}</strong>
          <span className="hint">single 330ml can, shelf / list</span>
        </label>
        <input
          id="price-input"
          type="range"
          min={MODEL_LIMITS.price[0]}
          max={MODEL_LIMITS.price[1]}
          step="0.05"
          value={price}
          onChange={(e) => set({ price: Number(e.target.value) })}
        />
        <div className="ticks">
          {[1.79, 2.19, 2.59].map((p) => (
            <button
              key={p}
              type="button"
              className="ghost"
              aria-pressed={Math.abs(price - p) < 0.001}
              onClick={() => set({ price: p })}
            >
              {fmtEur(p)}
            </button>
          ))}
        </div>
      </div>

      <div className="control">
        <span className="label">
          Marketing budget split
          <span className="hint">
            {mixTotal === 0 ? "select at least one channel" : "share of year-1 spend"}
          </span>
        </span>
        {CHANNELS.map((c, index) => {
          const id = `mix-${index}`;
          const normalised = mixTotal === 0 ? 0 : mix[c] / mixTotal;
          return (
          <div className="mix-row" key={c}>
            <label className="mix-name" htmlFor={id}>{c}</label>
            <input
              id={id}
              type="range"
              min="0"
              max="100"
              step="5"
              value={Math.round(mix[c] * 100)}
              aria-valuetext={`${fmtPct(normalised, 0)} of the normalised budget mix`}
              onChange={(e) => updateMix(c, Number(e.target.value))}
            />
            <span className="mix-val">
              {mixTotal === 0 ? "—" : fmtPct(normalised, 0)}
            </span>
          </div>
          );
        })}
      </div>

      <div className="control control-grid">
        <div>
          <label htmlFor="budget">
            Year-1 marketing budget <strong>{fmtEur0(budget)}</strong>
            <span className="hint">illustrative envelope; the brief gives no German budget</span>
          </label>
          <input
            id="budget"
            type="range"
            min="100000"
            max={MODEL_LIMITS.budget[1]}
            step="25000"
            value={budget}
            onChange={(e) => set({ budget: Number(e.target.value) })}
          />
        </div>
        <div>
          <label htmlFor="region">
            Launch region
            <span className="hint">changes opportunity context, not forecast units</span>
          </label>
          <select
            id="region"
            value={region}
            onChange={(e) => set({ region: e.target.value })}
          >
            {["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt", "Other Germany"].map(
              (r) => (
                <option key={r} value={r}>{r}</option>
              ),
            )}
          </select>
        </div>
      </div>

      <div className="control">
        <label htmlFor="cacel">
          Stress test: does a higher price make customers harder to win?
          <span className="hint">
            {cacElasticity === 0
              ? "No — CAC stays exactly as the home-market data reports it."
              : cacElasticity >= 0.95
                ? "Fully — CAC rises in step with the shrinking pool who accept the price"
                : `Partly — ${fmtPct(cacElasticity, 0)} of the way to fully endogenous CAC`}
          </span>
        </label>
        <input
          id="cacel"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={cacElasticity}
          onChange={(e) => set({ cacElasticity: Number(e.target.value) })}
        />
      </div>

      <div className="control">
        <label htmlFor="ret">
          Customer stays for <strong>{retentionMonths} months</strong>
          <span className="hint">unobserved in Germany; 12 months would fail the 3:1 gate</span>
        </label>
        <input
          id="ret"
          type="range"
          min="6"
          max="36"
          step="1"
          value={retentionMonths}
          onChange={(e) => set({ retentionMonths: Number(e.target.value) })}
        />
      </div>
    </aside>
  );
}

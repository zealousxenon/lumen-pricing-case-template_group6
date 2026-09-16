import { regions, cityProfile, addressableMarket, fmtEur0, fmtPct } from "../model.js";

// Where to land first. Market size and growth come from market_context.csv;
// intent and price sensitivity come from the 420-person German survey. A city
// that is big but sceptical is not the same bet as one that is small and eager.
export default function Regions({ region, onPick }) {
  const addr = addressableMarket(2026);
  const rows = Object.entries(regions).map(([name, r]) => {
      return {
        name,
        share: r.share,
        cagr: r.cagr,
        value: addr * r.share,
        n: cityProfile[name]?.n ?? null,
        intent: cityProfile[name]?.intent ?? null,
        priceSensitivity: cityProfile[name]?.priceSensitivity ?? null,
      };
    });

  return (
    <div className="regions-block">
      <div
        className="table-wrap"
        role="region"
        aria-label="Regional launch evidence"
        tabIndex="0"
      >
        <table className="regions">
          <caption className="sr-only">
            German regional market context and survey indicators
          </caption>
        <thead>
          <tr>
            <th>Region</th>
            <th>Share of DE category</th>
            <th>Addressable value 2026</th>
            <th>Growth</th>
            <th>Survey n</th>
            <th>Purchase intent</th>
            <th>Price sensitivity</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className={r.name === region ? "is-on" : ""}>
              <td>
                <strong>{r.name}</strong>
                {r.name === "Berlin" ? <span className="sub">recommended city</span> : null}
                {r.name === "Other Germany" ? <span className="sub">residual aggregate</span> : null}
              </td>
              <td>{fmtPct(r.share, 0)}</td>
              <td>{fmtEur0(r.value)}</td>
              <td className={r.cagr >= 0.09 ? "pos" : ""}>{fmtPct(r.cagr, 0)}</td>
              <td>{r.n ?? "—"}</td>
              <td>{r.intent ? `${r.intent.toFixed(2)} / 10` : "—"}</td>
              <td>{r.priceSensitivity ? `${r.priceSensitivity.toFixed(2)} / 10` : "—"}</td>
              <td>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => onPick(r.name)}
                  disabled={r.name === region}
                >
                  {r.name === region ? "selected" : "select"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      <p className="regions-note">
        No composite score is used: a 40% national residual cannot be compared
        fairly with a single city. Berlin is selected from the named cities on
        scale (18%), joint-highest growth (9%) and strong survey intent (7.40/10).
      </p>
    </div>
  );
}

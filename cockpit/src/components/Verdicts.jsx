import {
  fmtEur,
  fmtEur0,
  fmtMonths,
  fmtNum,
  fmtPct,
  acceptanceFromSurvey,
} from "../model.js";

const TARGET_LTV_CAC = 3;

export function Kpis({ s }) {
  const t = s.totals;
  const cards = [
    {
      k: "Volume signal",
      label: "Acceptance",
      value: fmtPct(s.acceptance, 1),
      note: `Raw Van Westendorp cross-check: ${fmtPct(acceptanceFromSurvey(s.price), 1)}`,
      tone: s.acceptance >= 0.45 ? "ok" : s.acceptance >= 0.3 ? "warn" : "bad",
    },
    {
      k: "What LUMEN keeps",
      label: "Blended contribution",
      value: t.units > 0 ? fmtEur(t.blendedContribution) : "—",
      note: "per unit, after channel cuts and COGS",
      tone: t.blendedContribution >= 1 ? "ok" : t.blendedContribution >= 0.7 ? "warn" : "bad",
    },
    {
      k: "The CFO's question",
      label: "CAC payback",
      value: fmtMonths(t.blendedPayback),
      note: "months of purchases to repay the cost of winning the customer",
      tone: t.blendedPayback <= 6 ? "ok" : t.blendedPayback <= 12 ? "warn" : "bad",
    },
    {
      k: "The plan's own target",
      label: "LTV : CAC",
      value: t.blendedLtvCac ? `${t.blendedLtvCac.toFixed(2)} : 1` : "—",
      note: `target is ${TARGET_LTV_CAC}:1`,
      tone:
        t.blendedLtvCac >= TARGET_LTV_CAC
          ? "ok"
          : t.blendedLtvCac >= 2
            ? "warn"
            : "bad",
    },
    {
      k: "Year one",
      label: "Net of marketing",
      value: fmtEur0(t.netOfMarketing),
      note: `${fmtNum(t.units)} units · ${fmtNum(t.customers)} customers · ${fmtEur0(t.revenue)} LUMEN revenue`,
      tone: t.netOfMarketing >= 0 ? "ok" : t.netOfMarketing >= -150000 ? "warn" : "bad",
    },
  ];

  return (
    <div className="kpis" aria-live="polite">
      {cards.map((c) => (
        <article key={c.label} className={`kpi is-${c.tone}`}>
          <p className="kpi-kicker">{c.k}</p>
          <h4>{c.label}</h4>
          <p className="kpi-value">{c.value}</p>
          <p className="kpi-note">{c.note}</p>
        </article>
      ))}
    </div>
  );
}

export function ChannelTable({ s }) {
  if (s.perChannel.length === 0) {
    return <p className="empty">Give at least one channel a share of the budget.</p>;
  }
  return (
    <div className="table-wrap" role="region" aria-label="Channel economics" tabIndex="0">
      <table className="channels">
        <caption className="sr-only">Economics and verdict for each funded channel</caption>
        <thead>
          <tr>
            <th>Channel</th>
            <th>Contribution</th>
            <th>Cans / customer / month</th>
            <th>CAC</th>
            <th>Payback</th>
            <th>LTV : CAC</th>
            <th>Year-1 net</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {s.perChannel.map((r) => {
            const pass = r.ltvCac >= TARGET_LTV_CAC;
            const close = !pass && r.ltvCac >= 2.4;
            return (
              <tr key={r.channel} className={pass ? "row-ok" : close ? "row-warn" : "row-bad"}>
                <td>
                  <strong>{r.channel}</strong>
                  <span className="sub">{fmtPct(r.weight, 0)} of budget</span>
                </td>
                <td>
                  {fmtEur(r.contribution)}
                  <span className="sub">
                    {fmtEur(r.netPrice)} net · {r.marginPct.toFixed(1)}%
                  </span>
                </td>
                <td>{r.frequency.toFixed(1)}</td>
                <td>{fmtEur(r.cac, 0)}</td>
                <td>{fmtMonths(r.paybackMonths)}</td>
                <td>
                  <strong>{r.ltvCac.toFixed(2)}</strong>
                  <span className="sub">needs CAC ≤ {fmtEur(r.breakEvenCac, 0)}</span>
                </td>
                <td className={r.netOfMarketing >= 0 ? "pos" : "neg"}>
                  {fmtEur0(r.netOfMarketing)}
                </td>
                <td>
                  <span className={`pill ${pass ? "pill-ok" : close ? "pill-warn" : "pill-bad"}`}>
                    {pass ? "clears 3:1" : close ? "close" : "misses 3:1"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TradeOff({ s, tensions }) {
  const lost = tensions.filter((t) => t.acceptsPrice !== null && t.acceptsPrice < 0.6);
  const kept = tensions.filter((t) => t.acceptsPrice !== null && t.acceptsPrice >= 0.6);
  const retail = s.perChannel.find((c) => c.channel === "Retail/Grocery");
  const noRetail = !retail || retail.weight === 0;

  return (
    <div className="tradeoff-box" aria-live="polite">
      <h4>What this choice gives up</h4>
      <ul>
        {noRetail ? (
          <li>
            <strong>46.4% of German demand.</strong> That is the share of the
            survey whose preferred way to buy is Retail/Grocery — the channel this
            plan is not funding in year one. They are not lost forever, but they
            cannot buy LUMEN yet.
          </li>
        ) : (
          <li>
            <strong>Payback discipline.</strong> Retail/Grocery is in the mix, and
            it repays its acquisition cost in {fmtMonths(retail.paybackMonths)} at
            a LTV:CAC of {retail.ltvCac.toFixed(2)} — below the 3:1 the plan
            assumes. Funding it buys reach at the cost of the CFO&apos;s target.
          </li>
        )}
        {lost.length > 0 ? (
          <li>
            <strong>Most of {lost.map((t) => t.segment).join(" and ")}.</strong>{" "}
            At {fmtEur(s.price)},{" "}
            {lost
              .map((t) => `only ${fmtPct(t.acceptsPrice, 0)} of ${t.segment} are still short of calling it expensive`)
              .join(", and ")}
            . Together they are {fmtPct(lost.reduce((a, b) => a + b.share, 0), 0)}{" "}
            of the German sample — the volume story this price walks away from.
          </li>
        ) : null}
        {kept.length > 0 ? (
          <li>
            <strong>Kept:</strong>{" "}
            {kept
              .map((t) => `${t.segment} (${fmtPct(t.acceptsPrice, 0)} still comfortable)`)
              .join(", ")}
            .
          </li>
        ) : null}
        <li>
          <strong>Scale in year one.</strong> Consumer sales value of{" "}
          {fmtEur0(s.totals.consumerSalesValue)} is{" "}
          {fmtPct(s.context.marketShareOfRegion, 2)} of the addressable category
          value in {s.context.region}. This is context, not a demand forecast;
          modeled customers still come from budget divided by CAC.
        </li>
      </ul>
    </div>
  );
}

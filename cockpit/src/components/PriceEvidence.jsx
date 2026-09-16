import {
  ACCEPTANCE_POINTS,
  acceptanceFromSurvey,
  fmtEur,
  fmtPct,
  unitContribution,
} from "../model.js";

const signal = (acceptance, price, channel) =>
  acceptance * unitContribution(price, channel);

export default function PriceEvidence() {
  const rows = ACCEPTANCE_POINTS.map(({ price, acc }) => {
    const raw = acceptanceFromSurvey(price);
    return {
      price,
      reported: acc,
      raw,
      dtcReported: signal(acc, price, "DTC Online"),
      dtcRaw: signal(raw, price, "DTC Online"),
      gymReported: signal(acc, price, "Gym & Office"),
      gymRaw: signal(raw, price, "Gym & Office"),
    };
  });

  return (
    <div
      className="table-wrap price-evidence"
      role="region"
      aria-label="Observed price evidence and sensitivity"
      tabIndex="0"
    >
      <table>
        <caption>
          Observed candidates — acceptance × contribution per exposed buyer
        </caption>
        <thead>
          <tr>
            <th>Price</th>
            <th>Reported acceptance</th>
            <th>Raw survey proxy</th>
            <th>DTC signal<br /><span>reported / raw</span></th>
            <th>Gym signal<br /><span>reported / raw</span></th>
            <th>What changes?</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.price} className={row.price === 2.19 ? "is-recommended" : ""}>
              <td><strong>{fmtEur(row.price)}</strong></td>
              <td>{fmtPct(row.reported, 1)}</td>
              <td className={Math.abs(row.reported - row.raw) > 0.05 ? "neg" : ""}>
                {fmtPct(row.raw, 1)}
              </td>
              <td>{fmtEur(row.dtcReported, 3)} / {fmtEur(row.dtcRaw, 3)}</td>
              <td>{fmtEur(row.gymReported, 3)} / {fmtEur(row.gymRaw, 3)}</td>
              <td>
                {row.price === 1.79
                  ? "The source mismatch can make Gym prefer the low price."
                  : row.price === 2.19
                    ? "Best across all channels using reported acceptance."
                    : "Higher margin cannot offset the acceptance drop."}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

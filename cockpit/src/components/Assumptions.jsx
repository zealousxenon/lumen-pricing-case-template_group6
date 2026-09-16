import {
  DATA_NOTES,
  DEFAULT_CAC_MAP,
  cacByMarketingChannel,
  blendedCac,
  COGS,
  costComponents,
  awareness,
  highIntentShare,
  channelPreference,
  fmtEur,
  fmtPct,
} from "../model.js";

export default function Assumptions() {
  return (
    <div className="assumptions">
      <div className="assump-block">
        <h4>What we had to decide for ourselves</h4>
        <ol>
          <li>
            <strong>Marketing channels are not sales channels.</strong>{" "}
            <code>marketing_funnel_monthly.csv</code> reports CAC for Paid Social,
            Influencer/Content, Retail Sampling and Referral/Subscription. Sales
            happen through DTC, Retail and Gym. Nothing in the data room connects
            the two lists, so we mapped them:
            <ul className="map">
              {Object.entries(DEFAULT_CAC_MAP).map(([sales, mix]) => (
                <li key={sales}>
                  <strong>{sales}</strong> ={" "}
                  {Object.entries(mix)
                    .map(([m, w]) => `${fmtPct(w, 0)} ${m}`)
                    .join(" + ")}
                </li>
              ))}
            </ul>
          </li>
          <li>
            <strong>Recent CAC, not average CAC.</strong> We use the last six
            months rather than all eighteen, because CAC has improved steadily
            across the window and the early months describe a business that no
            longer exists. Blended across all eighteen months it is{" "}
            {fmtEur(blendedCac, 0)} — the figure quoted in the brief.
            {" "}
            {Object.entries(cacByMarketingChannel)
              .map(([k, v]) => `${k} ${fmtEur(v, 0)}`)
              .join(" · ")}
          </li>
          <li>
            <strong>The CAC mapping is a scenario, not a join.</strong> Its visible
            percentages are interpreted as acquired-customer composition weights;
            they are not observed spend shares. The source file also supplies LTV
            by marketing channel, but cannot tell us DTC, Retail or Gym LTV. We
            therefore recompute sales-channel LTV and expose retention separately.
          </li>
          <li>
            <strong>Purchase frequency comes from Germany, not from home.</strong>{" "}
            Cans per customer per month are the German survey&apos;s own
            self-reported frequency, split by the channel each respondent prefers,
            rather than implied from NL/DK/SE sales.
          </li>
          <li>
            <strong>Year one is a 50% linear ramp assumption.</strong> Customers are
            assumed to arrive evenly through the year, so on average each buys for
            half a year. This is not observed German demand; without the haircut,
            modeled year-one volume and contribution roughly double.
          </li>
          <li>
            <strong>The acceptance curve is interpolated, not observed.</strong>{" "}
            <code>price_test_results.csv</code> gives three prices. Between adjacent
            points we interpolate in log-odds so the curve reproduces all three
            observations exactly and stays monotonic. Outside €1.79–€2.59 it is
            extrapolation and should be treated as such.
          </li>
          <li>
            <strong>Budget and retention are explicit scenario choices.</strong>{" "}
            The brief supplies neither a German launch budget nor a retention
            period. The reference uses a €400k envelope and 18 months; both are
            adjustable. At 12 months the recommended mix misses the 3:1 gate.
          </li>
          <li>
            <strong>Seasonality moves with weather; causality is unproven.</strong>{" "}
            The supplied file places temperature beside the monthly demand index.
            We use that index for launch timing, but do not claim temperature alone
            causes the change. Its twelve-month average is 101.7 rather than 100,
            so it is not used as a unit-volume multiplier.
          </li>
        </ol>
      </div>

      <div className="assump-block">
        <h4>Data-quality notes</h4>
        <ul className="notes">
          {DATA_NOTES.map((n) => (
            <li key={n.title} className={`note note-${n.severity}`}>
              <span className="note-tag">{n.severity}</span>
              <strong>{n.title}</strong>
              <p>{n.detail}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="assump-block">
        <h4>Personal data</h4>
        <p>
          <code>data/customer_survey.csv</code> ships with the case carrying
          <code>first_name</code>, <code>last_name</code> and <code>email</code>{" "}
          for 420 people. We do not use them: nothing in this analysis needs to
          know who answered, only what they answered. Rather than filter them at
          render time, we generated{" "}
          <code>data/customer_survey_anonymised.csv</code>, the team&apos;s shared
          copy with those three columns removed and a non-identifying row number,
          and the app imports only that file. Those anonymous analytical rows are
          bundled into the browser because the charts need them; names and email
          addresses are not. There is no server or database endpoint. The original
          case file stays untouched.
        </p>
      </div>

      <div className="assump-block">
        <h4>Operational boundaries</h4>
        <ul className="boundary-list">
          <li><strong>No external API or API key.</strong> Every result is computed in the browser from repository CSVs.</li>
          <li><strong>No storage.</strong> Scenarios last only for the current page session; nothing is sent or persisted.</li>
          <li><strong>Guarded inputs.</strong> The model clamps non-finite, negative and out-of-range values and returns zeros for an empty channel mix.</li>
          <li><strong>Separate deployment.</strong> This personal app lives only in <code>cockpit/</code>; it does not replace or rewrite the team app at the repository root.</li>
        </ul>
      </div>

      <div className="assump-block">
        <h4>Reference figures</h4>
        <div className="ref-grid">
          <div>
            <h5>Cost per can</h5>
            <ul>
              {costComponents.map((c) => (
                <li key={c.cost_component}>
                  <span>{c.cost_component}</span>
                  <span>{fmtEur(c.cost_per_unit_eur)}</span>
                </li>
              ))}
              <li className="total">
                <span>Total COGS</span>
                <span>{fmtEur(COGS)}</span>
              </li>
            </ul>
          </div>
          <div>
            <h5>Competitor awareness in Germany</h5>
            <ul>
              {Object.entries(awareness).map(([k, v]) => (
                <li key={k}>
                  <span>{k}</span>
                  <span>{fmtPct(v, 0)}</span>
                </li>
              ))}
              <li className="total">
                <span>LUMEN</span>
                <span>0% — never sold here</span>
              </li>
            </ul>
          </div>
          <div>
            <h5>How Germans say they buy</h5>
            <ul>
              {Object.entries(channelPreference)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <li key={k}>
                    <span>{k}</span>
                    <span>{fmtPct(v, 1)}</span>
                  </li>
                ))}
              <li className="total">
                <span>Purchase intent ≥ 7/10</span>
                <span>{fmtPct(highIntentShare, 1)}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

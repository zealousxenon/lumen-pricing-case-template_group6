import { useMemo } from "react";
import {
  DEFAULTS,
  channelEconomics,
  findBestPrice,
  fmtEur,
  fmtEur0,
  fmtMonths,
  fmtNum,
  fmtPct,
  runScenario,
} from "../model.js";

export default function Recommendation({
  reco,
  downside,
  optimistic,
  shortRetention,
  onReset,
  isReco,
}) {
  const t = reco.totals;
  const conservativePeak = useMemo(
    () => findBestPrice({ ...DEFAULTS, cacElasticity: 1 }),
    [],
  );
  const dtc = reco.perChannel.find((channel) => channel.channel === "DTC Online");
  const gym = reco.perChannel.find((channel) => channel.channel === "Gym & Office");
  const retail = useMemo(
    () =>
      channelEconomics(DEFAULTS.price, "Retail/Grocery", {
        cacElasticity: DEFAULTS.cacElasticity,
        retentionMonths: DEFAULTS.retentionMonths,
      }),
    [],
  );
  const dtcOnly = useMemo(
    () =>
      runScenario({
        ...DEFAULTS,
        mix: { "DTC Online": 1, "Retail/Grocery": 0, "Gym & Office": 0 },
      }),
    [],
  );
  const dtcCacHeadroom = dtc ? dtc.ltvCac / 3 - 1 : 0;
  const gymTrialCost = dtcOnly.totals.netOfMarketing - t.netOfMarketing;
  return (
    <section
      className="recommendation"
      id="recommendation"
      aria-labelledby="reco-title"
    >
      <p className="eyebrow">
        Personal contribution e263031 · LUMEN Germany market entry
      </p>
      <h1 id="reco-title">
        Pilot at <span className="hl">€2.19</span>, direct and in gyms, in{" "}
        <span className="hl">Berlin</span>, timed for <span className="hl">April</span>.
      </h1>

      <p className="lede">
        Freya asked where the real trade-off is, and asked us not to quietly pick a
        side. The honest answer is that the CMO-versus-CFO fight is not the one
        that matters. At every price we tested, the channel that repays fastest is
        also the one that carries the premium story — Jonas and Elena want the same
        thing there. The trade-off that does bite is <strong>reach against
        payback</strong>: Retail/Grocery is where 46% of Germans say they buy, and
        it returns {retail.ltvCac.toFixed(2)}:1 at €2.19 and never reaches 3:1 at any price the data room
        contains. Picking a price that works means accepting that LUMEN is not on a
        German supermarket shelf in year one.
      </p>

      <div className="reco-grid">
        <div>
          <h3>Price — €2.19 a can</h3>
          <p>
            On the reported price-test values, acceptance × unit contribution is
            highest at €2.19 in every channel: €0.600 DTC, €0.584 Gym and €0.326
            Retail per exposed buyer. The raw survey cross-check lifts €1.79 from
            61.7% to 77.3%; that makes DTC almost a tie and makes Gym prefer the
            cheaper can. We therefore choose €2.19 as a pilot hypothesis — for its
            reported economics and position in the shelf gap — not as a proven
            optimum. Under the full CAC-sensitivity curve its best point is{" "}
            {fmtEur(conservativePeak.price)}, but even that point loses money. The
            planning case leaves only {fmtPct(dtcCacHeadroom, 0)} additional DTC
            CAC headroom before missing 3:1, so German acquisition and a fresh
            price test are go/no-go evidence, not footnotes.
          </p>
        </div>
        <div>
          <h3>Positioning — the empty shelf</h3>
          <p>
            €2.19 sits in the gap between Mate Libre at €1.59 and VoltFit at €2.37.
            Below the value fight LUMEN cannot win — PulsUp runs a marketing spend
            index of 100 at around a euro — and below the premium brand LUMEN
            cannot outspend. It reads as a considered product without asking a new
            buyer to take a €3 risk on a can they have never tried.
          </p>
        </div>
        <div>
          <h3>Channels — DTC first, gyms second, no grocery</h3>
          <p>
            80% of the launch budget to DTC Online, 20% into gym and office
            fridges. DTC returns {dtc.ltvCac.toFixed(2)}:1 and repays acquisition
            in {fmtMonths(dtc.paybackMonths)}; it
            keeps the entire margin and it is where Urban Wellness Professionals —
            the highest-intent, least price-sensitive segment — already say they
            buy. The gym fridge returns {gym.ltvCac.toFixed(2)}:1 and costs roughly{" "}
            {fmtEur0(gymTrialCost)} of year-one contribution against a DTC-only
            plan. We are paying that on purpose: it is
            the only channel where a German picks up a can they have never tasted,
            45% of Fitness &amp; Gym-Goers name it as their channel, and a drink
            nobody has tried is a drink nobody re-orders. Retail/Grocery is
            different in kind — {retail.ltvCac.toFixed(2)}:1 in the planning case,
            losing money at every price in the data room — and that is the line we
            are not crossing.
          </p>
        </div>
        <div>
          <h3>Timing — pilot in April, scale from May to July</h3>
          <p>
            The supplied German seasonality index runs from 78 in January to 138
            in July — a 77% swing that moves with temperature, but does not prove
            temperature causes demand. Launching in April puts the first three months of
            sell-through, the ones a gym manager judges a new SKU on, at an average
            index of 116 rather than 81. Build listings, logistics and compliance
            through Q1 2027 and pilot in April. May is the only peak-window month
            with no listed competitor promotion; VoltFit then discounts to €2.16
            in June. Use April to learn, May to scale only if the gates hold, and
            treat June–July as an execution window rather than automatic spend.
          </p>
        </div>
      </div>

      <div className="reco-numbers">
        <div>
          <span className="n">{fmtPct(reco.acceptance, 0)}</span>
          <span className="l">accept the price</span>
        </div>
        <div>
          <span className="n">{fmtMonths(t.blendedPayback)}</span>
          <span className="l">CAC payback</span>
        </div>
        <div>
          <span className="n">{t.blendedLtvCac.toFixed(1)}:1</span>
          <span className="l">planning LTV : CAC (target 3:1)</span>
        </div>
        <div>
          <span className="n">{fmtNum(t.units)}</span>
          <span className="l">cans, year 1</span>
        </div>
        <div>
          <span className="n">{fmtEur0(t.revenue)}</span>
          <span className="l">LUMEN net revenue, year 1</span>
        </div>
        <div>
          <span className={`n ${t.netOfMarketing >= 0 ? "pos" : "neg"}`}>
            {fmtEur0(t.netOfMarketing)}
          </span>
          <span className="l">contribution net of marketing</span>
        </div>
      </div>

      <div className="reco-risk">
        <div>
          <span className="risk-label">Planning case and failure conditions</span>
          <strong>
            The displayed baseline assumes 25% of the acceptance drop flows into
            CAC, an illustrative €400k envelope and 18-month retention — none is
            an observed German outcome.
          </strong>
        </div>
        <p>
          With no price effect on CAC, the same plan reaches{" "}
          {optimistic.totals.blendedLtvCac.toFixed(2)}:1 and{" "}
          {fmtEur0(optimistic.totals.netOfMarketing)}; with a full effect it falls
          to {downside.totals.blendedLtvCac.toFixed(2)}:1 and{" "}
          {fmtEur0(downside.totals.netOfMarketing)}. At only 12 months&apos;
          retention it reaches {shortRetention.totals.blendedLtvCac.toFixed(2)}:1.
          Release budget in tranches only while measured blended CAC stays at or
          below {fmtEur(reco.totals.breakEvenCac, 0)}, the current 3:1 limit, and
          repeat purchase supports the retention assumption.
        </p>
      </div>

      <p className="reco-foot">
        These figures are the locked reference case, recomputed from the shared
        files in <code>data/</code>. Moving the controls updates the comparison
        below without silently rewriting this recommendation.{" "}
        {isReco ? (
          "The cockpit is currently set to the recommended scenario."
        ) : (
          <>
            The cockpit has been moved off the recommended scenario.{" "}
            <button type="button" className="ghost" onClick={onReset}>
              reset to the recommendation
            </button>
          </>
        )}
      </p>
    </section>
  );
}

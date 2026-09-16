import { useMemo, useState } from "react";
import {
  CHANNELS,
  DEFAULTS,
  runScenario,
  qualQuantTensions,
  seasonality,
  fmtPct,
} from "./model.js";
import Controls from "./components/Controls.jsx";
import { Kpis, ChannelTable, TradeOff } from "./components/Verdicts.jsx";
import PriceCurve from "./components/PriceCurve.jsx";
import PositioningMap from "./components/PositioningMap.jsx";
import Seasonality from "./components/Seasonality.jsx";
import Segments from "./components/Segments.jsx";
import Regions from "./components/Regions.jsx";
import Assumptions from "./components/Assumptions.jsx";
import Recommendation from "./components/Recommendation.jsx";
import ScenarioComparison from "./components/ScenarioComparison.jsx";
import PageNav from "./components/PageNav.jsx";
import PriceEvidence from "./components/PriceEvidence.jsx";

const RECOMMENDED = {
  price: DEFAULTS.price,
  mix: DEFAULTS.mix,
  budget: DEFAULTS.budget,
  region: DEFAULTS.region,
  cacElasticity: DEFAULTS.cacElasticity,
  retentionMonths: DEFAULTS.retentionMonths,
  launchMonth: 4,
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function App() {
  const [state, setState] = useState(RECOMMENDED);
  const set = (patch) => setState((s) => ({ ...s, ...patch }));

  const scenario = useMemo(
    () =>
      runScenario({
        price: state.price,
        mix: state.mix,
        budget: state.budget,
        region: state.region,
        cacElasticity: state.cacElasticity,
        retentionMonths: state.retentionMonths,
      }),
    [state],
  );

  // The recommendation panel always shows the recommended scenario, whatever the
  // cockpit is currently set to — otherwise dragging a slider would silently
  // rewrite the team's conclusion.
  const recoScenario = useMemo(
    () =>
      runScenario({
        price: RECOMMENDED.price,
        mix: RECOMMENDED.mix,
        budget: RECOMMENDED.budget,
        region: RECOMMENDED.region,
        cacElasticity: RECOMMENDED.cacElasticity,
        retentionMonths: RECOMMENDED.retentionMonths,
      }),
    [],
  );
  const downsideScenario = useMemo(
    () =>
      runScenario({
        ...RECOMMENDED,
        cacElasticity: 1,
      }),
    [],
  );
  const optimisticScenario = useMemo(
    () =>
      runScenario({
        ...RECOMMENDED,
        cacElasticity: 0,
      }),
    [],
  );
  const shortRetentionScenario = useMemo(
    () =>
      runScenario({
        ...RECOMMENDED,
        retentionMonths: 12,
      }),
    [],
  );

  const isReco = JSON.stringify(state) === JSON.stringify(RECOMMENDED);
  const tensions = useMemo(() => qualQuantTensions(state.price), [state.price]);

  const firstThree = [0, 1, 2].map(
    (i) => seasonality[(state.launchMonth - 1 + i) % 12].index,
  );
  const rampIndex = firstThree.reduce((a, b) => a + b, 0) / 3;
  const launchWindows = seasonality.map((_, start) => ({
    start,
    average:
      [0, 1, 2].reduce(
        (total, offset) => total + seasonality[(start + offset) % 12].index,
        0,
      ) / 3,
  }));
  const weakestWindow = launchWindows.reduce((weakest, candidate) =>
    candidate.average < weakest.average ? candidate : weakest,
  );
  const weakestWindowLabel = `${MONTH_NAMES[weakestWindow.start]}–${
    MONTH_NAMES[(weakestWindow.start + 2) % 12]
  }`;

  return (
    <main className="page">
      <a className="skip-link" href="#cockpit">Skip to scenario controls</a>
      <Recommendation
        reco={recoScenario}
        downside={downsideScenario}
        optimistic={optimisticScenario}
        shortRetention={shortRetentionScenario}
        isReco={isReco}
        onReset={() => setState(RECOMMENDED)}
      />
      <PageNav />

      <section className="section" id="cockpit">
        <header className="section-head">
          <p className="eyebrow">01 — The cockpit</p>
          <h2>Move any assumption and watch the decision move</h2>
          <p className="lede">
            The core economics recompute from the shared files in{" "}
            <code>data/</code> and the visible assumptions below. The fixed
            recommendation remains above as a reference, so exploring a scenario
            cannot silently rewrite the conclusion.
          </p>
        </header>
        <ScenarioComparison
          scenario={scenario}
          baseline={recoScenario}
          isBaseline={isReco}
          launchMonthLabel={MONTH_NAMES[state.launchMonth - 1]}
          onReset={() => setState(RECOMMENDED)}
        />
        <div className="cockpit">
          <Controls state={state} set={set} />
          <div className="cockpit-out">
            <Kpis s={scenario} />
            <ChannelTable s={scenario} />
            <TradeOff s={scenario} tensions={tensions} />
          </div>
        </div>
      </section>

      <section className="section" id="price">
        <header className="section-head">
          <p className="eyebrow">02 — Price</p>
          <h2>The price question is really a question about CAC</h2>
          <p className="lede">
            Using the acceptance reported in <code>price_test_results.csv</code>,
            €2.19 maximises acceptance × unit contribution at all three tested
            prices. The raw survey cross-check disagrees at €1.79 and can change
            the Gym answer, so the table makes that sensitivity explicit. The
            curves then show what happens between observations under two opposing
            CAC assumptions; neither line is treated as measured German demand.
          </p>
        </header>
        <PriceCurve
          price={state.price}
          mix={state.mix}
          budget={state.budget}
          region={state.region}
          onPick={(p) => set({ price: p })}
        />
        <PriceEvidence />
      </section>

      <section className="section" id="positioning">
        <header className="section-head">
          <p className="eyebrow">03 — Positioning</p>
          <h2>There is an empty stretch of shelf between €1.59 and €2.37</h2>
        </header>
        <PositioningMap price={state.price} />
      </section>

      <section className="section" id="segments">
        <header className="section-head">
          <p className="eyebrow">04 — Who you win, who you lose</p>
          <h2>Where the numbers and the verbatims disagree</h2>
          <p className="lede">
            The scenario model uses the three acceptance values reported in{" "}
            <code>price_test_results.csv</code>. The segment bars independently use
            a stricter Van Westendorp proxy: the share for whom the selected price
            has not yet crossed into <em>expensive</em>. The two sources reconcile
            at €2.19 and €2.59, not at €1.79. Read those bars against the quotes:
            the highest-intent segment warns about taste rather than price — a
            risk no pricing decision can fix.
          </p>
        </header>
        <Segments tensions={tensions} price={state.price} />
      </section>

      <section className="section" id="regions">
        <header className="section-head">
          <p className="eyebrow">05 — Where</p>
          <h2>Berlin is the largest named city and tied for fastest growth</h2>
          <p className="lede">
            Size and growth come from <code>market_context.csv</code>; intent and
            price sensitivity from the 420-person German survey. Hamburg reports
            the highest intent, but on 10% of the category against Berlin&apos;s 18%.
            &ldquo;Other Germany&rdquo; is a 40% residual aggregate, so it is shown
            as context and never ranked against individual cities.
          </p>
        </header>
        <Regions region={state.region} onPick={(r) => set({ region: r })} />
      </section>

      <section className="section" id="timing">
        <header className="section-head">
          <p className="eyebrow">06 — When</p>
          <h2>
            Launching in {MONTH_NAMES[state.launchMonth - 1]} means a first quarter
            averaging {rampIndex.toFixed(0)} on the demand index
          </h2>
          <p className="lede">
            The weakest comparable three-month window is {weakestWindowLabel}, at
            an average of {weakestWindow.average.toFixed(0)}. The selected window
            is therefore roughly {fmtPct(rampIndex / weakestWindow.average - 1, 0)}
            stronger on the supplied index. This is directional timing evidence:
            it is not multiplied into the year-one sales model above.
          </p>
        </header>
        <Seasonality
          launchMonth={state.launchMonth}
          onPick={(m) => set({ launchMonth: m })}
        />
      </section>

      <section className="section" id="method">
        <header className="section-head">
          <p className="eyebrow">07 — Show your working</p>
          <h2>Assumptions, judgement calls and what is wrong with the data</h2>
          <p className="lede">
            Some of this data room is imperfect on purpose. Here is what we found,
            what we did about it, and where we had to decide something the files do
            not tell us.
          </p>
        </header>
        <Assumptions />
      </section>

      <footer className="page-foot">
        <p>
          Personal contribution e263031 · LUMEN Germany decision cockpit · built
          for the ATELIA × ESCP workshop · no server or database · anonymous
          analytical rows are bundled, but names and email addresses are not.
        </p>
      </footer>
    </main>
  );
}

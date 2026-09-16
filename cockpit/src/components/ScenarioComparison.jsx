import { fmtEur, fmtEur0, fmtMonths, fmtPct } from "../model.js";

const signedEur = (value) => `${value >= 0 ? "+" : "-"}${fmtEur0(Math.abs(value))}`;
const signedNumber = (value, digits = 2) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;

export default function ScenarioComparison({
  scenario,
  baseline,
  isBaseline,
  launchMonthLabel,
  onReset,
}) {
  const current = scenario.totals;
  const reference = baseline.totals;
  const passesCfo = current.blendedLtvCac >= 3;
  const profitable = current.netOfMarketing >= 0;
  const fundedChannels = scenario.perChannel
    .map((channel) => `${channel.channel} ${fmtPct(channel.weight, 0)}`)
    .join(" · ");

  const metrics = [
    {
      label: "Net after marketing",
      value: fmtEur0(current.netOfMarketing),
      delta: signedEur(current.netOfMarketing - reference.netOfMarketing),
    },
    {
      label: "LTV : CAC",
      value: `${current.blendedLtvCac.toFixed(2)} : 1`,
      delta: `${signedNumber(current.blendedLtvCac - reference.blendedLtvCac)} vs baseline`,
    },
    {
      label: "CAC payback",
      value: fmtMonths(current.blendedPayback),
      delta: `${signedNumber(current.blendedPayback - reference.blendedPayback, 1)} months`,
    },
    {
      label: "LUMEN net revenue",
      value: fmtEur0(current.revenue),
      delta: signedEur(current.revenue - reference.revenue),
    },
  ];

  return (
    <section
      className={`scenario-compare ${isBaseline ? "is-baseline" : "is-alternative"}`}
      aria-live="polite"
      aria-label="Scenario compared with the recommended baseline"
    >
      <div className="scenario-head">
        <div>
          <p className="eyebrow">
            {isBaseline ? "Recommended baseline active" : "Alternative scenario"}
          </p>
          <h3>
            {fmtEur(scenario.price)} in {scenario.context.region}
            {fundedChannels ? ` · ${fundedChannels}` : " · no funded channel"}
            {launchMonthLabel ? ` · ${launchMonthLabel} start` : ""}
          </h3>
        </div>
        {!isBaseline ? (
          <button type="button" className="ghost" onClick={onReset}>
            Reset baseline
          </button>
        ) : null}
      </div>

      <div className="scenario-verdicts">
        <span className={`guardrail ${passesCfo ? "pass" : "fail"}`}>
          CFO guardrail {passesCfo ? "passes" : "fails"}: 3:1 LTV:CAC
        </span>
        <span className={`guardrail ${profitable ? "pass" : "fail"}`}>
          Year-one economics {profitable ? "positive" : "negative"}
        </span>
      </div>

      <div className="scenario-metrics">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <span className="l">{metric.label}</span>
            <strong>{metric.value}</strong>
            <span className="delta">
              {isBaseline ? "reference case" : metric.delta}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

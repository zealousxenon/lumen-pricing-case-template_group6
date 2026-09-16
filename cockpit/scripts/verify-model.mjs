// Verification harness. Bundles src/model.js with esbuild (resolving Vite's
// ?raw imports to plain text) and checks the engine against the numbers printed
// in the source files. Run with: npm run verify
import { build } from "esbuild";
import { readFileSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { parseCsv } from "../src/csv.js";

const rawPlugin = {
  name: "raw",
  setup(b) {
    b.onResolve({ filter: /\?raw$/ }, (args) => ({
      path: path.resolve(args.resolveDir, args.path.replace(/\?raw$/, "")),
      namespace: "raw",
    }));
    b.onLoad({ filter: /.*/, namespace: "raw" }, (args) => ({
      contents: `export default ${JSON.stringify(readFileSync(args.path, "utf8"))};`,
      loader: "js",
    }));
  },
};

const out = ".verify-bundle.mjs";
await build({
  entryPoints: ["src/model.js"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: out,
  plugins: [rawPlugin],
  logLevel: "silent",
});

const M = await import(pathToFileURL(path.resolve(out)).href);
rmSync(out, { force: true });

let failures = 0;
const near = (a, b, tol, label) => {
  const ok = Math.abs(a - b) <= tol;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label.padEnd(58)} got ${a.toFixed(4)}  expected ${b.toFixed(4)} (+-${tol})`,
  );
};

console.log("\n-- unit economics reproduce price_test_results.csv exactly --");
for (const r of M.priceTestRows) {
  near(
    M.netPrice(r.price_eur, r.channel),
    r.net_price_to_lumen_eur,
    0.006,
    `net price  ${r.channel} @ EUR${r.price_eur}`,
  );
  near(
    M.unitContribution(r.price_eur, r.channel),
    r.unit_contribution_eur,
    0.006,
    `contribution ${r.channel} @ EUR${r.price_eur}`,
  );
  near(
    M.contributionMarginPct(r.price_eur, r.channel),
    r.contribution_margin_pct,
    0.1,
    `margin %  ${r.channel} @ EUR${r.price_eur}`,
  );
}

console.log("\n-- channel_economics.csv also reproduces --");
for (const r of M.channelEconRows) {
  near(
    M.netPrice(r.illustrative_retail_price_eur, r.channel),
    r.net_price_to_lumen_eur,
    0.006,
    `net price  ${r.channel} @ EUR${r.illustrative_retail_price_eur}`,
  );
}

console.log("\n-- acceptance curve reproduces its three source anchors exactly --");
for (const p of M.ACCEPTANCE_POINTS) {
  near(M.acceptance(p.price), p.acc, 1e-9, `acceptance @ EUR${p.price}`);
}
let monotonic = true;
for (let price = 1.3; price < 3.09; price += 0.01) {
  if (M.acceptance(price + 0.01) > M.acceptance(price) + 1e-12) monotonic = false;
}
console.log(monotonic ? "PASS" : "FAIL", " acceptance is monotonically decreasing across the UI range");
if (!monotonic) failures += 1;

console.log("\n-- EUR2.19 wins the observed acceptance x contribution test --");
for (const channel of M.CHANNELS) {
  const candidates = M.ACCEPTANCE_POINTS.map(({ price, acc }) => ({
    price,
    signal: acc * M.unitContribution(price, channel),
  }));
  const best = candidates.reduce((winner, candidate) =>
    candidate.signal > winner.signal ? candidate : winner,
  );
  const ok = best.price === 2.19;
  console.log(
    ok ? "PASS" : "FAIL",
    ` ${channel.padEnd(24)} best observed price EUR${best.price.toFixed(2)} (${best.signal.toFixed(3)} per exposed buyer)`,
  );
  if (!ok) failures += 1;
}
const rawLowAcceptance = M.acceptanceFromSurvey(1.79);
near(rawLowAcceptance, 0.773, 0.005, "raw survey proxy @ EUR1.79");
const rawLowGymSignal =
  rawLowAcceptance * M.unitContribution(1.79, "Gym & Office");
const reportedMidGymSignal =
  M.ACCEPTANCE_POINTS.find((point) => point.price === 2.19).acc *
  M.unitContribution(2.19, "Gym & Office");
console.log(
  rawLowGymSignal > reportedMidGymSignal ? "PASS" : "FAIL",
  " raw EUR1.79 result changes the Gym price ranking and is material",
);
if (!(rawLowGymSignal > reportedMidGymSignal)) failures += 1;

console.log("\n-- headline figures quoted in the brief --");
near(M.COGS, 0.62, 0.001, "COGS per unit");
near(M.blendedCac, 44, 0.6, "blended CAC across all marketing channels");
near(M.acceptanceFromSurvey(2.19), 0.517, 0.005, "survey acceptance @ EUR2.19");
near(M.acceptanceFromSurvey(2.59), 0.267, 0.005, "survey acceptance @ EUR2.59");
near(M.addressableMarket(2026) + 2821e6 + 1547e6, 9.1e9, 1e6, "total DE market 2026 = EUR9.1bn");

console.log("\n-- the recommendation's load-bearing claims --");
const reco = M.runScenario();
const retail = M.channelEconomics(2.19, "Retail/Grocery", {
  cacElasticity: M.DEFAULTS.cacElasticity,
});
const dtc = M.channelEconomics(2.19, "DTC Online", {
  cacElasticity: M.DEFAULTS.cacElasticity,
});
console.log(
  retail.ltvCac < 3 ? "PASS" : "FAIL",
  ` Retail/Grocery misses 3:1 at EUR2.19 (LTV:CAC ${retail.ltvCac.toFixed(2)})`,
);
if (!(retail.ltvCac < 3)) failures += 1;
console.log(
  dtc.ltvCac > 3 ? "PASS" : "FAIL",
  ` DTC Online clears 3:1 at EUR2.19 (LTV:CAC ${dtc.ltvCac.toFixed(2)})`,
);
if (!(dtc.ltvCac > 3)) failures += 1;
const retailBest = M.channelEconomics(2.99, "Retail/Grocery", {
  cacElasticity: M.DEFAULTS.cacElasticity,
});
console.log(
  retailBest.ltvCac < 3 ? "PASS" : "FAIL",
  ` Retail/Grocery still misses 3:1 even at EUR2.99 (LTV:CAC ${retailBest.ltvCac.toFixed(2)})`,
);
if (!(retailBest.ltvCac < 3)) failures += 1;

const optimistic = M.runScenario({ cacElasticity: 0 });
const downside = M.runScenario({ cacElasticity: 1 });
const shortRetention = M.runScenario({ retentionMonths: 12 });
console.log(
  reco.totals.blendedLtvCac >= 3 && reco.totals.netOfMarketing >= 0 ? "PASS" : "FAIL",
  ` planning case narrowly passes: ${reco.totals.blendedLtvCac.toFixed(2)}:1, EUR${Math.round(reco.totals.netOfMarketing)}`,
);
if (!(reco.totals.blendedLtvCac >= 3 && reco.totals.netOfMarketing >= 0)) failures += 1;
console.log(
  downside.totals.blendedLtvCac < 3 && downside.totals.netOfMarketing < 0 ? "PASS" : "FAIL",
  ` full CAC sensitivity fails: ${downside.totals.blendedLtvCac.toFixed(2)}:1, EUR${Math.round(downside.totals.netOfMarketing)}`,
);
if (!(downside.totals.blendedLtvCac < 3 && downside.totals.netOfMarketing < 0)) failures += 1;
console.log(
  shortRetention.totals.blendedLtvCac < 3 ? "PASS" : "FAIL",
  ` 12-month retention fails: ${shortRetention.totals.blendedLtvCac.toFixed(2)}:1`,
);
if (!(shortRetention.totals.blendedLtvCac < 3)) failures += 1;
console.log(
  optimistic.totals.netOfMarketing > reco.totals.netOfMarketing ? "PASS" : "FAIL",
  " zero CAC sensitivity is labelled as the optimistic boundary",
);
if (!(optimistic.totals.netOfMarketing > reco.totals.netOfMarketing)) failures += 1;

console.log("\n-- the full CAC-sensitivity boundary exposes non-viability --");
const best = M.findBestPrice({ cacElasticity: 1 });
console.log(
  best.price === 2.19 && best.totals.netOfMarketing < 0 ? "PASS" : "FAIL",
  ` best full-sensitivity price = EUR${best.price.toFixed(2)}, still EUR${Math.round(best.totals.netOfMarketing)}`,
);
if (!(best.price === 2.19 && best.totals.netOfMarketing < 0)) failures += 1;

console.log("\n-- scenario arithmetic is internally consistent --");
near(
  reco.perChannel.reduce((s, r) => s + r.spend, 0),
  400000,
  1,
  "channel spend sums to budget",
);
near(
  reco.totals.grossContribution,
  reco.perChannel.reduce((s, r) => s + r.units * r.contribution, 0),
  1,
  "gross contribution = sum(units x contribution)",
);
near(
  reco.totals.revenue,
  reco.perChannel.reduce((s, r) => s + r.units * r.netPrice, 0),
  1,
  "LUMEN revenue = sum(units x net price)",
);
near(
  reco.totals.consumerSalesValue,
  reco.totals.units * reco.price,
  1,
  "consumer sales value = units x shelf price",
);
const munich = M.runScenario({ region: "Munich" });
near(
  munich.totals.units,
  reco.totals.units,
  1e-9,
  "region does not invent a sales-volume effect",
);
console.log(
  munich.context.regionMarketEur !== reco.context.regionMarketEur ? "PASS" : "FAIL",
  " region changes opportunity context only",
);
if (munich.context.regionMarketEur === reco.context.regionMarketEur) failures += 1;
console.log(
  M.runScenario({ mix: { "DTC Online": 0, "Retail/Grocery": 0, "Gym & Office": 0 } })
    .totals.units === 0
    ? "PASS"
    : "FAIL",
  " empty channel mix returns zeros rather than NaN",
);

const guarded = M.runScenario({
  price: Number.NaN,
  budget: -1,
  retentionMonths: -5,
  cacElasticity: 4,
  region: "not-a-region",
  mix: { "DTC Online": -2, "Retail/Grocery": Number.NaN, "Gym & Office": 1 },
});
console.log(
  guarded.price === M.DEFAULTS.price &&
    guarded.totals.spend === 0 &&
    guarded.context.region === M.DEFAULTS.region &&
    Object.values(guarded.totals).every((value) => !Number.isNaN(value))
    ? "PASS"
    : "FAIL",
  " invalid inputs are clamped or replaced without producing NaN",
);
if (!(
  guarded.price === M.DEFAULTS.price &&
  guarded.totals.spend === 0 &&
  guarded.context.region === M.DEFAULTS.region &&
  Object.values(guarded.totals).every((value) => !Number.isNaN(value))
)) failures += 1;

console.log("\n-- no personal data reaches the model --");
const leaked = ["first_name", "last_name", "email"].filter((c) =>
  Object.keys(M.surveyRows[0]).includes(c),
);
console.log(
  leaked.length === 0 ? "PASS" : "FAIL",
  ` survey rows expose no name/email columns${leaked.length ? ` (found ${leaked})` : ""}`,
);
if (leaked.length) failures += 1;

const rawSurvey = parseCsv(readFileSync("../data/customer_survey.csv", "utf8"));
const anonymousSurvey = parseCsv(
  readFileSync("../data/customer_survey_anonymised.csv", "utf8"),
);
const protectedColumns = new Set(["first_name", "last_name", "email"]);
const analyticalColumns = Object.keys(rawSurvey[0]).filter(
  (column) => !protectedColumns.has(column),
);
const anonymisationMatches =
  rawSurvey.length === anonymousSurvey.length &&
  rawSurvey.every((row, index) =>
    analyticalColumns.every(
      (column) => row[column] === anonymousSurvey[index][column],
    ),
  );
console.log(
  anonymisationMatches ? "PASS" : "FAIL",
  " anonymised survey preserves every analytical value and row",
);
if (!anonymisationMatches) failures += 1;

const segmentByCustomerId = new Map(
  M.surveyRows.map((row) => [row.respondent_id, row.segment]),
);
const overlappingPriceRows = M.vwRows.filter((row) =>
  segmentByCustomerId.has(row.respondent_id),
);
const mismatchedSegments = overlappingPriceRows.filter(
  (row) => segmentByCustomerId.get(row.respondent_id) !== row.segment,
);
console.log(
  overlappingPriceRows.length === 300 && mismatchedSegments.length === 216
    ? "PASS"
    : "FAIL",
  ` survey IDs are not joined (${mismatchedSegments.length}/${overlappingPriceRows.length} segment mismatches)`,
);
if (!(overlappingPriceRows.length === 300 && mismatchedSegments.length === 216)) {
  failures += 1;
}

console.log(
  failures === 0
    ? "\nAll checks passed.\n"
    : `\n${failures} check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);

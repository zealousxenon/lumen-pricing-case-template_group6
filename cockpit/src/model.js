// LUMEN Germany — economic engine.
//
// Source inputs come from data/. Judgement calls (budget, ramp, retention and
// the marketing-to-sales-channel mapping) are labelled in the UI; the key risk
// variables are adjustable and the fixed mapping is shown rather than hidden.

import { parseCsv } from "./csv.js";

import costCsv from "../../data/cost_breakdown.csv?raw";
import channelEconCsv from "../../data/channel_economics.csv?raw";
import priceTestCsv from "../../data/price_test_results.csv?raw";
import funnelCsv from "../../data/marketing_funnel_monthly.csv?raw";
import surveyCsv from "../../data/customer_survey_anonymised.csv?raw";
import vwCsv from "../../data/price_sensitivity_survey.csv?raw";
import marketCsv from "../../data/market_context.csv?raw";
import seasonCsv from "../../data/seasonality_and_weather.csv?raw";
import compPriceCsv from "../../data/competitor_prices_by_channel.csv?raw";
import quotesCsv from "../../data/customer_quotes.csv?raw";

// PRIVACY: data/customer_survey.csv ships with the case and contains
// first_name / last_name / email. This app imports the team's shared
// customer_survey_anonymised.csv instead. The anonymous analytical fields do
// reach the browser bundle; names and email addresses do not.

export const CHANNELS = ["DTC Online", "Retail/Grocery", "Gym & Office"];

export const costRows = parseCsv(costCsv);
export const channelEconRows = parseCsv(channelEconCsv);
export const priceTestRows = parseCsv(priceTestCsv);
export const funnelRows = parseCsv(funnelCsv);
export const surveyRows = parseCsv(surveyCsv);
export const vwRows = parseCsv(vwCsv);
export const marketRows = parseCsv(marketCsv);
export const seasonRows = parseCsv(seasonCsv);
export const competitorRows = parseCsv(compPriceCsv);
export const quoteRows = parseCsv(quotesCsv);

/* ------------------------------------------------------------------- costs */

export const COGS = costRows.find((r) =>
  String(r.cost_component).startsWith("TOTAL COGS"),
).cost_per_unit_eur;

export const costComponents = costRows.filter(
  (r) =>
    !String(r.cost_component).startsWith("TOTAL") &&
    !String(r.cost_component).startsWith("["),
);

/* -------------------------------------------------- channel cut structures */

export const channelStructure = Object.fromEntries(
  CHANNELS.map((channel) => {
    const r = channelEconRows.find((x) => x.channel === channel);
    return [
      channel,
      {
        retailer: r.retailer_margin_pct,
        distributor: r.distributor_cut_pct,
        payment: r.payment_processing_pct,
        fulfillment: r.fulfillment_cost_eur,
      },
    ];
  }),
);

// The provided files stack the cuts ADDITIVELY, not sequentially: at EUR2.19
// Retail/Grocery, 2.19 x (1 - 0.35 - 0.08) = 1.25, which is the figure in both
// channel_economics.csv and price_test_results.csv. Compounding them would give
// 1.31 and would silently overstate retail margin. We follow the files.
export function netPrice(price, channel) {
  const s = channelStructure[channel];
  const cuts = s.retailer + s.distributor + s.payment;
  return price * (1 - cuts) - s.fulfillment;
}

export function unitContribution(price, channel) {
  return netPrice(price, channel) - COGS;
}

export function contributionMarginPct(price, channel) {
  const net = netPrice(price, channel);
  return net <= 0 ? 0 : (unitContribution(price, channel) / net) * 100;
}

/* -------------------------------------------------------- acceptance curve */

// price_test_results.csv gives acceptance at exactly three prices. A single
// logistic regression only passes near those observations (and previously
// turned the documented 51.7% at EUR2.19 into 46.1%). We instead interpolate
// linearly in log-odds between adjacent observations. The result remains smooth
// and monotonic inside each interval while reproducing every source value
// exactly. Outside the tested range the nearest segment is extrapolated.
const testPoints = [...new Set(priceTestRows.map((r) => r.price_eur))]
  .sort((a, b) => a - b)
  .map((p) => ({
    price: p,
    acc:
      priceTestRows.find((r) => r.price_eur === p)
        .estimated_acceptance_pct_of_survey / 100,
  }));

export const ACCEPTANCE_POINTS = testPoints;

const LOGIT_POINTS = testPoints.map(({ price, acc }) => ({
  price,
  logit: Math.log(acc / (1 - acc)),
}));

function acceptanceSegment(price) {
  const last = LOGIT_POINTS.length - 1;
  if (price <= LOGIT_POINTS[0].price) return [LOGIT_POINTS[0], LOGIT_POINTS[1]];
  if (price >= LOGIT_POINTS[last].price) {
    return [LOGIT_POINTS[last - 1], LOGIT_POINTS[last]];
  }
  for (let i = 0; i < last; i += 1) {
    if (price <= LOGIT_POINTS[i + 1].price) {
      return [LOGIT_POINTS[i], LOGIT_POINTS[i + 1]];
    }
  }
  return [LOGIT_POINTS[last - 1], LOGIT_POINTS[last]];
}

export function acceptance(price) {
  const safePrice = Number.isFinite(price) ? price : DEFAULTS.price;
  const [a, b] = acceptanceSegment(safePrice);
  const slope = (b.logit - a.logit) / (b.price - a.price);
  const logit = a.logit + slope * (safePrice - a.price);
  return 1 / (1 + Math.exp(-logit));
}

// Price elasticity implied by that curve, at a given price.
export function elasticity(price) {
  const safePrice = Number.isFinite(price) ? price : DEFAULTS.price;
  const [a, b] = acceptanceSegment(safePrice);
  const slope = (b.logit - a.logit) / (b.price - a.price);
  return slope * safePrice * (1 - acceptance(safePrice));
}

// Independent cross-check from the raw Van Westendorp answers: share of
// respondents for whom `price` has not yet crossed into "expensive".
export function acceptanceFromSurvey(price) {
  return vwRows.filter((r) => r.expensive_eur >= price).length / vwRows.length;
}

export function acceptanceBySegment(price) {
  const out = {};
  for (const seg of [...new Set(vwRows.map((r) => r.segment))]) {
    const rows = vwRows.filter((r) => r.segment === seg);
    out[seg] = rows.filter((r) => r.expensive_eur >= price).length / rows.length;
  }
  return out;
}

/* ------------------------------------------------------------ German demand */

export const segmentProfile = (() => {
  const out = {};
  for (const seg of [...new Set(surveyRows.map((r) => r.segment))]) {
    const rows = surveyRows.filter((r) => r.segment === seg);
    const avg = (k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;
    const c = {};
    for (const r of rows) c[r.preferred_channel] = (c[r.preferred_channel] || 0) + 1;
    out[seg] = {
      n: rows.length,
      share: rows.length / surveyRows.length,
      age: avg("age"),
      spend: avg("monthly_beverage_spend_eur"),
      frequency: avg("purchase_frequency_per_month"),
      priceSensitivity: avg("price_sensitivity_1_10"),
      intent: avg("lumen_purchase_intent_1_10"),
      channel: Object.fromEntries(
        Object.entries(c).map(([k, v]) => [k, v / rows.length]),
      ),
    };
  }
  return out;
})();

// DEMAND-side preference: which channel Germans say they would buy through.
// Deliberately kept separate from where the money actually works.
export const channelPreference = (() => {
  const out = {};
  for (const r of surveyRows)
    out[r.preferred_channel] = (out[r.preferred_channel] || 0) + 1;
  for (const k of Object.keys(out)) out[k] /= surveyRows.length;
  return out;
})();

export const frequencyByChannel = (() => {
  const out = {};
  for (const ch of CHANNELS) {
    const rows = surveyRows.filter((r) => r.preferred_channel === ch);
    out[ch] =
      rows.reduce((s, r) => s + r.purchase_frequency_per_month, 0) / rows.length;
  }
  return out;
})();

export const highIntentShare =
  surveyRows.filter((r) => r.lumen_purchase_intent_1_10 >= 7).length /
  surveyRows.length;

export const awareness = {
  PulsUp: surveyRows.reduce((s, r) => s + r.aware_pulsup, 0) / surveyRows.length,
  "Mate Libre":
    surveyRows.reduce((s, r) => s + r.aware_matelibre, 0) / surveyRows.length,
  VoltFit:
    surveyRows.reduce((s, r) => s + r.aware_voltfit, 0) / surveyRows.length,
  "Root & Rise":
    surveyRows.reduce((s, r) => s + r.aware_rootandrise, 0) / surveyRows.length,
};

export const cityProfile = (() => {
  const out = {};
  for (const city of [...new Set(surveyRows.map((r) => r.city))]) {
    const rows = surveyRows.filter((r) => r.city === city);
    const avg = (k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;
    out[city] = {
      n: rows.length,
      intent: avg("lumen_purchase_intent_1_10"),
      spend: avg("monthly_beverage_spend_eur"),
      priceSensitivity: avg("price_sensitivity_1_10"),
    };
  }
  return out;
})();

/* ------------------------------------------------------------- acquisition */

// CAC per MARKETING channel from the last 6 months of marketing_funnel_monthly
// (spend / customers acquired). Last 6 rather than all 18 because CAC has been
// improving steadily and the older months are simply stale.
export const cacByMarketingChannel = (() => {
  const months = [...new Set(funnelRows.map((r) => r.month))].sort();
  const recent = new Set(months.slice(-6));
  const out = {};
  for (const ch of [...new Set(funnelRows.map((r) => r.channel))]) {
    const rows = funnelRows.filter((r) => r.channel === ch && recent.has(r.month));
    out[ch] =
      rows.reduce((s, r) => s + r.spend_eur, 0) /
      rows.reduce((s, r) => s + r.conversions_customers_acquired, 0);
  }
  return out;
})();

export const blendedCac =
  funnelRows.reduce((s, r) => s + r.spend_eur, 0) /
  funnelRows.reduce((s, r) => s + r.conversions_customers_acquired, 0);

// WHY: marketing_funnel_monthly.csv is organised by MARKETING channel
// (Paid Social, Influencer, Retail Sampling, Referral/Subscription) while sales
// happen through SALES channels (DTC, Retail, Gym). Nothing in the data room
// maps one to the other, so we use an explicit, visible scenario mapping. Its
// weights are interpreted as acquired-customer composition, not spend shares.
export const DEFAULT_CAC_MAP = {
  "DTC Online": {
    "Referral / Subscription": 0.55,
    "Paid Social": 0.3,
    "Influencer / Content": 0.15,
  },
  "Retail/Grocery": { "Retail Sampling": 0.7, "Paid Social": 0.3 },
  "Gym & Office": { "Retail Sampling": 0.6, "Influencer / Content": 0.4 },
};

export function cacForChannel(channel, map = DEFAULT_CAC_MAP) {
  const mix = map[channel];
  const total = Object.values(mix).reduce((a, b) => a + b, 0);
  return (
    Object.entries(mix).reduce((s, [m, w]) => s + w * cacByMarketingChannel[m], 0) /
    total
  );
}

/* ----------------------------------------------------------- market sizing */

export const marketByYear = (() => {
  const out = {};
  for (const r of marketRows.filter((x) => x.dimension_type === "subcategory")) {
    out[r.year] = out[r.year] || {};
    out[r.year][r.name] = r.value;
  }
  return out;
})();

// LUMEN is green-tea caffeine + adaptogens: it competes in "Energy / focus"
// and "Plant-based / adaptogenic", not in Hydration or Other functional.
export const ADDRESSABLE_SUBCATEGORIES = [
  "Energy / focus",
  "Plant-based / adaptogenic",
];

export function addressableMarket(year = 2026) {
  return ADDRESSABLE_SUBCATEGORIES.reduce(
    (s, k) => s + (marketByYear[year]?.[k] || 0),
    0,
  );
}

export function totalMarket(year = 2026) {
  return Object.values(marketByYear[year] || {}).reduce((a, b) => a + b, 0);
}

export const regions = (() => {
  const out = {};
  for (const r of marketRows.filter((x) => x.dimension_type === "region")) {
    out[r.name] = out[r.name] || {};
    if (r.metric === "population_share_of_market") out[r.name].share = r.value;
    if (r.metric === "regional_cagr") out[r.name].cagr = r.value;
  }
  return out;
})();

export const seasonality = seasonRows.map((r) => ({
  month: r.month,
  index: r.seasonality_index_100_avg,
  temp: r.avg_temp_germany_celsius,
}));

/* ---------------------------------------------------------- the main model */

export const DEFAULTS = {
  price: 2.19,
  mix: { "DTC Online": 0.8, "Retail/Grocery": 0, "Gym & Office": 0.2 },
  budget: 400000,
  region: "Berlin",
  retentionMonths: 18,
  // Planning case: 25% of the acceptance-pool contraction flows into CAC.
  // This is a scenario assumption, not a measured German elasticity.
  cacElasticity: 0.25,
  rampFactor: 0.5,
};

export const MODEL_LIMITS = {
  price: [1.29, 3.09],
  budget: [0, 1_200_000],
  retentionMonths: [1, 60],
  cacElasticity: [0, 1],
  rampFactor: [0, 1],
};

const finiteOr = (value, fallback) => (Number.isFinite(value) ? value : fallback);
const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value));

export function normaliseScenarioInput(opts = {}) {
  const rawMix = opts.mix && typeof opts.mix === "object" ? opts.mix : DEFAULTS.mix;
  const mix = Object.fromEntries(
    CHANNELS.map((channel) => [
      channel,
      Math.max(0, finiteOr(rawMix[channel], DEFAULTS.mix[channel] || 0)),
    ]),
  );
  const region = Object.hasOwn(regions, opts.region) ? opts.region : DEFAULTS.region;

  return {
    price: clamp(finiteOr(opts.price, DEFAULTS.price), MODEL_LIMITS.price),
    mix,
    budget: clamp(finiteOr(opts.budget, DEFAULTS.budget), MODEL_LIMITS.budget),
    region,
    retentionMonths: clamp(
      finiteOr(opts.retentionMonths, DEFAULTS.retentionMonths),
      MODEL_LIMITS.retentionMonths,
    ),
    cacElasticity: clamp(
      finiteOr(opts.cacElasticity, DEFAULTS.cacElasticity),
      MODEL_LIMITS.cacElasticity,
    ),
    rampFactor: clamp(
      finiteOr(opts.rampFactor, DEFAULTS.rampFactor),
      MODEL_LIMITS.rampFactor,
    ),
    cacMap: opts.cacMap || DEFAULT_CAC_MAP,
  };
}

// Home markets realise ~EUR1.35/unit (historical_sales_weekly: revenue/units).
// Every CAC in the data room was earned at that price, for a brand with local
// awareness. Assuming it holds at EUR2.59 for a brand with zero German
// awareness is the most fragile assumption available, so we expose it:
// cacElasticity scales CAC by acceptance(EUR1.35) / acceptance(price).
export const HOME_PRICE = 1.35;

export function effectiveCac(price, channel, opts = {}) {
  const { cacElasticity = DEFAULTS.cacElasticity, cacMap = DEFAULT_CAC_MAP } = opts;
  const base = cacForChannel(channel, cacMap);
  const ratio = acceptance(HOME_PRICE) / acceptance(price);
  return base * (1 + cacElasticity * (ratio - 1));
}

export function channelEconomics(price, channel, opts = {}) {
  const { retentionMonths = DEFAULTS.retentionMonths } = opts;
  const contribution = unitContribution(price, channel);
  const frequency = frequencyByChannel[channel];
  const cac = effectiveCac(price, channel, opts);
  const monthlyContribution = frequency * contribution;
  const ltv = monthlyContribution * retentionMonths;
  return {
    channel,
    netPrice: netPrice(price, channel),
    contribution,
    marginPct: contributionMarginPct(price, channel),
    frequency,
    cac,
    monthlyContribution,
    paybackMonths: monthlyContribution > 0 ? cac / monthlyContribution : Infinity,
    ltv,
    ltvCac: cac > 0 ? ltv / cac : 0,
    breakEvenCac: ltv / 3,
  };
}

export function runScenario(opts = {}) {
  const {
    price,
    mix,
    budget,
    region,
    retentionMonths,
    cacElasticity,
    rampFactor,
    cacMap,
  } = normaliseScenarioInput(opts);

  const weightTotal = CHANNELS.reduce((s, c) => s + (mix[c] || 0), 0);
  const acc = acceptance(price);

  const perChannel =
    weightTotal === 0
      ? []
      : CHANNELS.filter((c) => (mix[c] || 0) > 0).map((channel) => {
          const w = mix[channel] / weightTotal;
          const e = channelEconomics(price, channel, {
            retentionMonths,
            cacElasticity,
            cacMap,
          });
          const spend = budget * w;
          const customers = spend / e.cac;
          const units = customers * e.frequency * 12 * rampFactor;
          const grossContribution = units * e.contribution;
          return {
            ...e,
            weight: w,
            spend,
            customers,
            units,
            consumerSalesValue: units * price,
            revenue: units * e.netPrice,
            grossContribution,
            netOfMarketing: grossContribution - spend,
          };
        });

  const sum = (k) => perChannel.reduce((s, r) => s + r[k], 0);
  const units = sum("units");
  const customers = sum("customers");
  const grossContribution = sum("grossContribution");
  const consumerSalesValue = sum("consumerSalesValue");
  const weightedCac = customers > 0 ? budget / customers : 0;
  const weightedMonthly =
    customers > 0
      ? perChannel.reduce((s, r) => s + r.customers * r.monthlyContribution, 0) /
        customers
      : 0;
  const weightedLtv =
    customers > 0
      ? perChannel.reduce((s, r) => s + r.customers * r.ltv, 0) / customers
      : 0;

  const regionShare = regions[region]?.share ?? 1;
  const regionMarketEur = addressableMarket(2026) * regionShare;

  return {
    price,
    acceptance: acc,
    perChannel,
    totals: {
      spend: perChannel.length ? budget : 0,
      customers,
      units,
      consumerSalesValue,
      revenue: sum("revenue"),
      grossContribution,
      netOfMarketing: grossContribution - (perChannel.length ? budget : 0),
      blendedContribution: units > 0 ? grossContribution / units : 0,
      blendedCac: weightedCac,
      blendedLtv: weightedLtv,
      breakEvenCac: weightedLtv / 3,
      blendedPayback:
        weightedMonthly > 0 ? weightedCac / weightedMonthly : Infinity,
      blendedLtvCac: weightedCac > 0 ? weightedLtv / weightedCac : 0,
    },
    context: {
      region,
      regionMarketEur,
      marketShareOfRegion:
        regionMarketEur > 0 ? consumerSalesValue / regionMarketEur : 0,
    },
  };
}

export function findBestPrice(opts = {}, sweep = {}) {
  const min = finiteOr(sweep.min, MODEL_LIMITS.price[0]);
  const max = finiteOr(sweep.max, MODEL_LIMITS.price[1]);
  const step = Math.max(0.01, finiteOr(sweep.step, 0.01));
  let best = null;
  for (let price = min; price <= max + step / 2; price += step) {
    const rounded = Math.round(price * 100) / 100;
    const scenario = runScenario({ ...opts, price: rounded });
    if (!best || scenario.totals.netOfMarketing > best.totals.netOfMarketing) {
      best = scenario;
    }
  }
  return best;
}

/* -------------------------------------------------------- competitor frame */

export const competitorSingleCan = competitorRows
  .filter((r) => String(r.format).startsWith("Single"))
  .reduce((acc, r) => {
    acc[r.competitor] = acc[r.competitor] || {
      positioning: r.positioning,
      spendIndex: r.marketing_spend_index_0_100,
      byChannel: {},
    };
    acc[r.competitor].byChannel[r.channel] = r.price_eur;
    return acc;
  }, {});

export function competitorShelfRange() {
  return Object.entries(competitorSingleCan)
    .map(([name, c]) => {
      const prices = Object.values(c.byChannel);
      return {
        name,
        positioning: c.positioning,
        spendIndex: c.spendIndex,
        low: Math.min(...prices),
        high: Math.max(...prices),
        retail: c.byChannel["Retail/Grocery"] ?? Math.min(...prices),
      };
    })
    .sort((a, b) => a.retail - b.retail);
}

/* ------------------------------------------------ qual vs quant reconciler */

export function qualQuantTensions(price) {
  const bySeg = acceptanceBySegment(price);
  return Object.keys(segmentProfile)
    .map((seg) => {
      const p = segmentProfile[seg];
      return {
        segment: seg,
        share: p.share,
        intent: p.intent,
        frequency: p.frequency,
        priceSensitivity: p.priceSensitivity,
        acceptsPrice: bySeg[seg] ?? null,
        preferredChannel: Object.entries(p.channel).sort((a, b) => b[1] - a[1])[0],
        quotes: quoteRows.filter((q) => q.segment === seg),
      };
    })
    .sort((a, b) => b.share - a.share);
}

/* -------------------------------------------------------------- data notes */

export const DATA_NOTES = [
  {
    severity: "material",
    title: "Acceptance at EUR1.79 does not reconcile with the raw survey",
    detail:
      "price_test_results.csv reports 61.7% acceptance at EUR1.79. Recomputing the raw Van Westendorp proxy that matches EUR2.19 and EUR2.59 gives 77.3%. That change makes DTC nearly tie EUR2.19 on acceptance x contribution and makes Gym prefer EUR1.79. We keep the reported series in the scenario model, display both views, and make a fresh German price test a launch gate rather than claiming the conclusion is invariant.",
  },
  {
    severity: "resolved",
    title: "Channel cuts stack additively, not sequentially",
    detail:
      "For Retail/Grocery the file's net price is lower than compounding 35% and 8% one after the other. 2.19 x (1 - 0.43) = 1.25 reproduces the file exactly. We use the additive convention throughout; the sequential one would overstate retail contribution by roughly 10% and would make the retail case look better than it is.",
  },
  {
    severity: "cleaned",
    title: "Four duplicated rows in historical_sales_weekly.csv",
    detail:
      "706 rows contain 4 exact duplicates (2025-07-14 NL, 2025-09-22 DK, 2025-12-22 DK, 2026-04-27 NL), each repeated once at the end of the file. We removed them during the audit before checking aggregates; no historical-sales metric drives this cockpit. Left in, they inflate those weeks by up to 40%.",
  },
  {
    severity: "material",
    title: "The brief's EUR3.2M trailing revenue is not in the sales file",
    detail:
      "historical_sales_weekly.csv, de-duplicated, gives EUR1.16M over the trailing 52 weeks and EUR1.62M across all 78. The brief says NL/DK/SE 'generate roughly EUR3.2M in trailing revenue'. This cockpit does not use either figure to forecast Germany; if EUR3.2M is right, the supplied file is a subset of the business.",
  },
  {
    severity: "checked",
    title: "No spike week, and the promo flag does not move price",
    detail:
      "The data README warns of an unusual spike week. After de-duplication and seasonal adjustment, no week in any country x channel series exceeds three standard deviations. Separately, weeks flagged promo_active show the same realised price per unit as non-promo weeks (about EUR1.35), so the promo flag cannot be read as a discount signal.",
  },
  {
    severity: "material",
    title: "The two survey respondent IDs are not a join key",
    detail:
      "All 300 IDs in price_sensitivity_survey.csv also appear in customer_survey_anonymised.csv, but 216 carry a different segment. They are separate synthetic extracts, not two tables describing the same person. This cockpit aggregates each file independently and never joins them row by row.",
  },
  {
    severity: "material",
    title: "German survey evidence is synthetic and unweighted",
    detail:
      "README_data.md describes the 420-row customer survey as synthetic, and the data room provides no sampling frame or weights. Overall percentages are directional; city and segment cuts have still smaller samples. They support a pilot design, not a population-precise German forecast.",
  },
];

/* ------------------------------------------------------------- formatting */

export const fmtEur = (v, dp = 2) => {
  const sign = v < 0 ? "−" : "";
  return `${sign}€${Math.abs(v).toLocaleString("en-IE", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })}`;
};
export const fmtEur0 = (v) => {
  const sign = v < 0 ? "−" : "";
  return `${sign}€${Math.round(Math.abs(v)).toLocaleString("en-IE", {
    maximumFractionDigits: 0,
  })}`;
};
export const fmtNum = (v) =>
  Math.round(v).toLocaleString("en-IE", { maximumFractionDigits: 0 });
export const fmtPct = (v, dp = 1) => `${(v * 100).toFixed(dp)}%`;
export const fmtMonths = (v) => (Number.isFinite(v) ? `${v.toFixed(1)} mo` : "never");

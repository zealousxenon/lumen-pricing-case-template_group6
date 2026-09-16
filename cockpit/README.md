# LUMEN Germany — Personal Decision Cockpit (e263031)

This is the personal contribution by **e263031**: a second, self-contained take
on the LUMEN case that lives entirely in `cockpit/`. It coexists with the team
app at the repository root and does not replace or modify any of its source
files. Same shared data room, same question, deliberately different model: this
tool produces **one defensible recommendation**, shows its assumptions and lets
the reader compare alternatives without silently rewriting the conclusion.

```
npm ci
npm run dev       # local
npm run verify    # re-checks the model against the CSVs
npm run build     # production build
```

It reads the shared CSVs in the repo-root `data/` folder — nothing is duplicated.
The root team app currently reaches a different launch recommendation; both are
kept so reviewers can see two analytical approaches rather than one overwriting
the other.

## The recommendation

**Pilot in Berlin in April at €2.19 a can, 80% of the budget direct-to-consumer
and 20% into gym and office fridges, with no grocery listing in year one. Scale
from May only if CAC and repeat-purchase gates hold.**

Freya asked where the real trade-off is, and asked us not to quietly pick a side.
The honest answer is that the CMO-versus-CFO fight is not the one that matters. At
every price we tested, the channel that repays fastest is also the one that carries
the premium story — Jonas and Elena want the same thing there and do not know it.
The trade-off that does bite is **reach against payback**: Retail/Grocery takes 43%
of the shelf price before LUMEN sees a cent, returns 1.14:1 at €2.19 in the
planning case and never
reaches the plan's own 3:1 target at any price in the data room, not even at €2.99.
It is also where 46% of surveyed Germans say they buy. Choosing a price that works
means accepting that LUMEN is not on a German supermarket shelf in year one.

Using the acceptance values in `price_test_results.csv`, the observed candidates
make the strongest case for €2.19: multiplying acceptance by unit contribution
gives the highest expected contribution per exposed buyer in all three channels
(DTC €0.600, Gym €0.584, Retail €0.326). But the raw survey cross-check raises
€1.79 acceptance from 61.7% to 77.3%; that makes DTC almost a tie and makes Gym
prefer the low price. €2.19 is therefore a pilot hypothesis supported by the
reported test and the shelf position, not a proven optimum.

Every CAC figure was earned in home markets where LUMEN sells around €1.35 with
an established local brand. The planning case therefore assumes that 25% of the
smaller price-acceptance pool flows into CAC. At 0% sensitivity the economics are
optimistic (€80,901 contribution net of marketing); at 100% they fail
(−€52,936). The full-sensitivity curve has a best point at €2.19 but even that
point loses money. This is why the recommendation is a gated pilot rather than a
full rollout. The €1.35 home-market stress point is outside the German tested
range (€1.79–€2.59), so that endpoint is a boundary scenario, not a forecast.

| | Year 1 |
|---|---|
| Acceptance at €2.19 | 51.7% |
| Blended CAC payback | 5.5 months |
| Blended LTV:CAC | 3.29 : 1 (target 3:1) |
| Units | 380,498 cans |
| LUMEN net revenue after channel cuts | €674,524 |
| Consumer sales value at list price | €833,290 |
| Contribution net of marketing | €38,616; excludes fixed launch overhead |

### The one choice worth challenging

On the arithmetic alone the answer is DTC and nothing else. The app calculates
the cost of adding the 20% gym allocation against the same planning scenario. We
are buying trial with that sacrifice: it is the only channel where a German picks
up a can they have never tasted, 45% of Fitness & Gym-Goers name it as where they
buy, and that segment's verbatims are conditional on taste rather than price. A
DTC-only plan has no answer for that person.

It is also worth saying that the gym CAC is the softest number in the model.
`marketing_funnel_monthly.csv` reports acquisition cost by *marketing* channel and
the sales channels are a different list; nothing in the data room connects them.
The €48 we use is our own mapping (60% Retail Sampling, 40% Influencer/Content),
not a measurement. The mapping is shown in the Method section; the CAC-sensitivity
and retention sliders are the first controls a sceptical reader should move.

## What we found wrong in the data

1. **Acceptance at €1.79 does not reconcile.** `price_test_results.csv` says 61.7%.
   Recomputing it from `price_sensitivity_survey.csv` the way that reproduces the
   other two prices exactly — the share for whom the price has not yet crossed into
   "expensive" — gives 51.7% at €2.19 and 26.7% at €2.59, matching to the decimal,
   but 77.3% at €1.79. Two of three tie out and one does not, and the one that does
   not understates the volume case for the cheap price by about 16 points. This is
   material: the raw result makes DTC nearly tie €2.19 and makes Gym prefer €1.79.
   Both views are shown, and re-testing price acceptance is a launch gate.
2. **Channel cuts stack additively, not sequentially.** 2.19 × (1 − 0.35 − 0.08) =
   1.25 reproduces the file exactly; compounding gives 1.31. Using the sequential
   convention overstates retail contribution by ~10% and makes the grocery case
   look better than it is.
3. **Four duplicated rows** in `historical_sales_weekly.csv` (2025-07-14 NL,
   2025-09-22 DK, 2025-12-22 DK, 2026-04-27 NL), each repeated at the end of the
   file. Left in, they inflate those weeks by up to 40%.
4. **The brief's €3.2M trailing revenue is not in the sales file.** De-duplicated,
   it gives €1.16M over the trailing 52 weeks. The cockpit uses neither figure to
   forecast Germany.
5. **No spike week, and the promo flag does not move price.** After de-duplication
   and seasonal adjustment nothing exceeds three standard deviations, and
   promo-flagged weeks realise the same €1.35 per unit as the rest — so the flag
   cannot be read as a discount signal.

## Personal data

`data/customer_survey.csv` carries `first_name`, `last_name` and `email` for 420
people. This app never imports it. It reads
`data/customer_survey_anonymised.csv` instead — the team's shared 420-row copy
with those three columns removed and a non-identifying row number. The anonymous
analytical fields are bundled because the charts need them; names and addresses
are not. `npm run verify` fails if those sensitive columns ever reach the model.
The team root app now uses the same protected shared file.

## What we had to decide for ourselves

- **Marketing channels are not sales channels.** The funnel file reports CAC for
  Paid Social, Influencer/Content, Retail Sampling and Referral/Subscription; sales
  happen through DTC, Retail and Gym. We mapped them as acquired-customer
  composition weights, and the mapping is visible in section 07. It is not a
  measured join and the UI does not pretend otherwise.
- **Recent CAC, not average CAC.** Last six months rather than all eighteen: CAC
  has improved steadily and the early months describe a business that no longer
  exists. Blended across all eighteen it is €44, the figure quoted in the brief.
- **Purchase frequency comes from Germany.** Cans per customer per month are the
  German survey's own self-reported frequency, split by preferred channel, rather
  than implied from NL/DK/SE sales.
- **Budget, retention and ramp are assumptions.** The brief gives no German budget
  or retention period. The reference uses an illustrative €400k envelope, 18
  months for LTV and a 50% year-one ramp from even customer acquisition. At 12
  months the 3:1 gate fails; budget and retention are adjustable in the cockpit.
- **The acceptance curve is interpolated.** Three tested prices, with log-odds
  interpolation between adjacent anchors so all three source observations are
  reproduced exactly. Outside €1.79–€2.59 it is extrapolation.
- **Region is context, not a volume driver.** It changes the addressable market
  comparison, while customers still come from budget divided by CAC. The model
  does not invent a German buyer-population denominator.
- **Seasonality is directional.** The monthly index supports an April launch
  window; it is not applied to all year-one units and its correlation with
  temperature is not treated as proof of causality.
- **Marketing-source quality is a limitation.** The source funnel gives both CAC
  and LTV by marketing channel, but it does not connect those channels to DTC,
  Retail or Gym sales. This cockpit maps CAC transparently and recomputes LTV from
  sales-channel contribution, frequency and retention; it does not pretend the
  missing join exists.
- **The survey extracts must not be joined on respondent ID.** All 300 IDs in the
  price survey overlap with the customer survey, but 216 have a different segment.
  Each synthetic, unweighted extract is aggregated independently.

## Deploying this personal app alongside the root app

Create a second Vercel project on the same repository and branch, then set **Root
Directory** to `cockpit`, Framework to **Vite**, and output to `dist`. Enable
**Include source files outside of the Root Directory in the Build Step** because
the app imports the shared `../data/` files. This gives the personal analysis its
own URL while leaving the team deployment and root source untouched.

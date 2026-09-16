import { fmtEur, fmtPct } from "../model.js";

// The qual/quant reconciler. The survey and the verbatims do not always agree,
// and where they disagree is where a pricing decision actually gets made.
export default function Segments({ tensions, price }) {
  return (
    <div className="segments">
      {tensions.map((t) => {
        const accepts = t.acceptsPrice ?? 0;
        const tone = accepts >= 0.9 ? "ok" : accepts >= 0.5 ? "warn" : "bad";
        const negative = t.quotes.find((q) => q.sentiment === "negative");
        const positive = t.quotes.find((q) => q.sentiment === "positive");
        return (
          <article className={`segment is-${tone}`} key={t.segment}>
            <header>
              <h4>{t.segment}</h4>
              <span className="share">{fmtPct(t.share, 0)} of the German sample</span>
            </header>

            <div className="seg-bar">
              <span style={{ width: `${accepts * 100}%` }} />
            </div>
            <p className="seg-accept">
              <strong>{fmtPct(accepts, 0)}</strong> have not yet crossed into
              &ldquo;expensive&rdquo; at {fmtEur(price)}
            </p>

            <dl>
              <div>
                <dt>Purchase intent</dt>
                <dd>{t.intent.toFixed(1)} / 10</dd>
              </div>
              <div>
                <dt>Price sensitivity</dt>
                <dd>{t.priceSensitivity.toFixed(1)} / 10</dd>
              </div>
              <div>
                <dt>Cans / month</dt>
                <dd>{t.frequency.toFixed(1)}</dd>
              </div>
              <div>
                <dt>Buys through</dt>
                <dd>
                  {t.preferredChannel[0]}{" "}
                  <span className="sub">{fmtPct(t.preferredChannel[1], 0)}</span>
                </dd>
              </div>
            </dl>

            {positive ? (
              <blockquote className="q-pos">“{positive.quote}”</blockquote>
            ) : null}
            {negative ? (
              <blockquote className="q-neg">“{negative.quote}”</blockquote>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

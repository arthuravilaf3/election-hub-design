/**
 * THE WIN PROMO (Sep 25 2026). The night has one moment the rest of the
 * page is built to reach: the called seats cross the majority. When they
 * cross for the Republicans, the shop's Left Tears Tumbler reads directly
 * under the headline that just said so.
 *
 * It is tied to `results.control`, which the reducer only sets from CALLED
 * seats — never from a lead (PRD tenet 1). So the promo cannot appear off
 * the back of a projection, and if a later batch takes the majority away
 * again it goes with it.
 *
 * PLACEHOLDER: the tumbler below is drawn here, not the product photo, and
 * PRICE is a stand-in. Both want the real thing from the shop before this
 * goes anywhere near a reader.
 */
import { track } from '../data/analytics';

const PRICE = '$29.99'; // PLACEHOLDER — read the live price from the shop.
const SHOP_URL = 'https://www.dailywire.com/shop';

/** The tumbler, drawn: a tapered cup, a lid, a straw and a handle. */
function Tumbler() {
  return (
    <svg viewBox="0 0 120 160" aria-hidden="true" className="win-promo-art">
      {/* the straw, behind the lid */}
      <rect x="66" y="6" width="7" height="26" rx="3.5" fill="var(--color-gray-300)" />
      {/* lid */}
      <rect x="26" y="26" width="68" height="14" rx="7" fill="var(--color-gray-200)" />
      {/* body: tapered, in the party's colour */}
      <path
        d="M32 42h56l-7 100a8 8 0 0 1-8 7H47a8 8 0 0 1-8-7Z"
        fill="var(--color-chart-rep-safe)"
      />
      {/* the band the artwork sits on */}
      <path d="M34.6 78h50.8l-2.2 30H36.8Z" fill="rgb(0 0 0 / 0.22)" />
      {/* handle */}
      <path
        d="M88 56c14 2 20 12 19 24-1 11-8 18-19 20"
        fill="none"
        stroke="var(--color-gray-200)"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WinPromo({ headline }: { headline: string }) {
  return (
    <aside className="win-promo" aria-label="Shop the Left Tears Tumbler">
      <div className="win-promo-figure">
        <Tumbler />
      </div>
      <div className="win-promo-copy">
        <p className="win-promo-eyebrow">{headline}</p>
        <h2 className="win-promo-title">Left Tears Tumbler</h2>
        <p className="win-promo-dek">
          Insulated, 20 ounces, and it keeps them cold all four years.
        </p>
      </div>
      <div className="win-promo-buy">
        <span className="win-promo-price">{PRICE}</span>
        <a
          className="win-promo-cta"
          href={SHOP_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('win_promo_click', { product: 'left-tears-tumbler' })}
        >
          Get yours
        </a>
      </div>
    </aside>
  );
}

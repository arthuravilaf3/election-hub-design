// Election Day countdown (PRD P1) — the pill above the race tabs.
// Per the Figma comp: brand/bold/pressed ground, radius 4, icon + one line
// of DS label/400/sm, the number in semibold.
export const ELECTION_DAY = '2026-11-03T00:00:00-05:00';

function daysUntil(target: string, now: number): number {
  const ms = new Date(target).getTime() - now;
  return Math.ceil(ms / 86_400_000);
}

/** The DW mark (src/images/dw-icon.svg), painted with currentColor so it
 *  follows the pill's text token instead of a baked-in fill. */
function CountdownMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <g clipPath="url(#dw-countdown-clip)" fill="currentColor">
        <path d="M17.5517 5.75H6.3457C6.87452 6.23017 7.44229 6.83037 8.00681 7.56684H17.5485L18.3076 5.75H17.5517Z" />
        <path d="M8.65308 8.47568C8.43898 8.15126 8.22159 7.84953 8.00421 7.56727C7.43645 6.8308 6.87192 6.2306 6.3431 5.75043C4.84094 4.38456 3.63731 3.95306 3.57891 3.93359H0.308594V5.75043V7.56727V9.38411H9.28251C9.07487 9.09536 8.86396 8.79039 8.65308 8.47568Z" />
        <path d="M9.28516 9.38477C9.77504 10.0563 10.2714 10.663 10.7516 11.2016H17.5485L18.3077 9.38477H17.5485V9.388H9.28516V9.38477Z" />
        <path d="M10.7522 11.1992H0.308594V13.0161H12.5723C12.0142 12.5229 11.3946 11.9195 10.7522 11.1992Z" />
        <path d="M15.0289 14.8325H17.5498L18.3089 13.0156H17.5498H12.5762C13.9485 14.229 14.951 14.7903 15.0289 14.8325Z" />
      </g>
      <defs>
        <clipPath id="dw-countdown-clip">
          <rect width="18" height="18" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

interface CountdownProps {
  now?: number;
}

export function Countdown({ now = Date.now() }: CountdownProps) {
  const days = daysUntil(ELECTION_DAY, now);

  return (
    <p className="countdown">
      <CountdownMark />
      {days > 1 ? (
        <span>
          <strong>{days}</strong> Days to election day
        </span>
      ) : days === 1 ? (
        <span>Election Day is tomorrow</span>
      ) : days === 0 ? (
        <span>Election Day</span>
      ) : (
        <span>Election Day has passed</span>
      )}
    </p>
  );
}

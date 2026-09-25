// Entrance choreography (Sep 2026), lifted from the election-hub-2026
// prototype: runs once, on load, top to bottom. Everything reads its delay
// from INTRO_AT so the order lives in one place. Under reduced motion the
// CSS pairs switch every entrance off, so the delays are inert there.
import type { CSSProperties } from 'react';

/**
 * THE WORDS READ FIRST (Sep 25 2026). The page is a sentence before it is a
 * chart: masthead, seat line, headline — and only once those have landed
 * does the arc deal itself. The arc used to start at 660ms, on top of the
 * headline still rising, and the two motions fought for the eye.
 */
export const INTRO_AT = {
  /* the byline arrives first, then the letters of the name */
  presented: 40,
  title: 90,
  mark: 400, // after the last letter of "The Midterms"
  rule: 220,
  /* The seat line where it sits on top of the hero (option 1). */
  seatline: 430,
  statement: 560,
  /* Option 2 hangs the seat line UNDER the headline, so there it waits
     its turn instead of arriving before the sentence it belongs to. */
  seatlineStacked: 700,
  /* The arc, after the text. */
  dots: 1000,
  /* The clock at the foot of the column lights up while the arc fills. */
  countdown: 1080,
} as const;

/**
 * A RACE CHANGE READS THE SAME WAY (Sep 25 2026): the headline for the new
 * chamber lands, then its seats deal themselves. Not the page's 1000ms —
 * nothing else is arriving, so the copy only has to get out in front.
 */
export const REDEAL_AT = {
  statement: 0,
  dots: 300,
} as const;

export function introDelay(ms: number): CSSProperties {
  return { animationDelay: `${ms}ms` };
}

/** Letters get their own inline-blocks so they can resolve one by one;
    spaces stay text so the words still break and measure normally. */
export function Letters({
  text,
  base,
  step,
  className,
}: {
  text: string;
  base: number;
  step: number;
  className?: string;
}) {
  let n = 0;
  return (
    <span className={className}>
      {text.split('').map((ch, i) =>
        ch === ' ' ? (
          ' '
        ) : (
          <span key={i} className="letter" style={introDelay(base + n++ * step)}>
            {ch}
          </span>
        )
      )}
    </span>
  );
}

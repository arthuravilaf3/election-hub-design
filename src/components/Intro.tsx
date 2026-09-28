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
  /* THE BLOCK AT THE FOOT, in the column's own order — after the headline
     and the seat line, BEFORE the arc (Sep 28 2026). It used to have no
     entrance at all on the first load: its rule and its eyebrow were simply
     there from the first frame and then, a second later and after the seats
     had started dealing, the figures rolled in underneath them. */
  clock: 820,
  /* The figures sweep left to right from there — days, hours, minutes,
     seconds — each label landing with its own first digit. */
  countdown: 880,
  /* The arc last, after the whole column has read. */
  dots: 1060,
} as const;

/**
 * A RACE CHANGE READS THE SAME WAY (Sep 25 2026): the headline for the new
 * chamber lands, then its seats deal themselves. Not the page's 1000ms —
 * nothing else is arriving, so the copy only has to get out in front.
 */
export const REDEAL_AT = {
  statement: 0,
  /* The column reads top to bottom on a race change the way it does on the
     page's entrance — headline, the seat line under it, the block at the
     foot, then the seats. They overlap; only the order matters, and without
     one the eye has nowhere to start. */
  seatline: 80,
  clock: 160,
  /* Far enough behind the headline to read as "after it", not so far that
     the biggest chamber takes a full second to finish arriving — and after
     the clock, so the column keeps its order here too. */
  dots: 280,
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

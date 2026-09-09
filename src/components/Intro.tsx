// Entrance choreography (Sep 2026), lifted from the election-hub-2026
// prototype: runs once, on load, top to bottom. Everything reads its delay
// from INTRO_AT so the order lives in one place. Under reduced motion the
// CSS pairs switch every entrance off, so the delays are inert there.
import type { CSSProperties } from 'react';

export const INTRO_AT = {
  /* the byline arrives first, then the letters of the name */
  presented: 40,
  title: 110,
  mark: 430, // after the last letter of "The Midterms"
  rule: 260,
  countdown: 360,
  statement: 520,
  dots: 660,
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

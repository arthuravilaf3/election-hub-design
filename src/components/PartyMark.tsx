// The party's mark in a small square (Sep 24 2026): the seat line's "D 215"
// and "R 220" carry white figures now, so the colour moves into a chip
// beside them — the party colour with its animal in the chart's on-dark ink.
//
// PLACEHOLDER ART: the silhouettes below are drawn here, not the DNC/GOP
// marks. They stand in until real artwork lands, the way the game's tile
// does elsewhere.
import type { Party } from '../data/types';

const LABEL: Record<Party, string> = { dem: 'Democrats', rep: 'Republicans' };

function Donkey() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {/* the two long ears */}
      <path d="M5.6 2.6c.6-1 2-.7 2.2.4l.7 3.3-2.2.6-.8-2.8c-.1-.5-.1-1 .1-1.5Z" />
      <path d="M9.2 2.4c.7-.9 2.1-.4 2.1.8l-.1 3.2-2.2.1.1-2.9c0-.4 0-.8.1-1.2Z" />
      {/* muzzle, head and neck in one wedge */}
      <path d="M5.2 6.6 11.4 5.5c.6 0 1 .5 1 1.1l.5 4.3-6.3 1.5-1.8-4.4c-.2-.6.1-1.3.4-1.4Z" />
      {/* body */}
      <ellipse cx="15" cy="13.2" rx="6.2" ry="4.3" />
      {/* legs */}
      <rect x="9.9" y="16.2" width="2.1" height="5.4" rx=".9" />
      <rect x="13.6" y="16.9" width="2.1" height="4.7" rx=".9" />
      <rect x="17.6" y="16.2" width="2.1" height="5.4" rx=".9" />
      {/* tail */}
      <path d="M20.9 9.9c1.4.3 2.2 1.7 1.6 3l-1.1-.5c.3-.7-.1-1.3-.8-1.5Z" />
    </svg>
  );
}

function Elephant() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {/* body */}
      <ellipse cx="15.3" cy="12.4" rx="6.1" ry="4.8" />
      {/* head */}
      <circle cx="8.4" cy="11.4" r="5" />
      {/* the ear, standing proud of the head */}
      <ellipse cx="11.4" cy="8.6" rx="3" ry="3.6" transform="rotate(18 11.4 8.6)" />
      {/* the trunk: down the face and curling forward */}
      <path d="M4.5 12.4c-1.6 1.9-1.9 4.2-.6 6.3.6 1 2.2.1 1.6-.9-.9-1.5-.7-2.9.4-4.1.8-.8-.7-2.1-1.4-1.3Z" />
      {/* legs */}
      <rect x="9.4" y="15.8" width="2.3" height="5.6" rx=".9" />
      <rect x="13.4" y="16.4" width="2.3" height="5" rx=".9" />
      <rect x="17.6" y="15.8" width="2.3" height="5.6" rx=".9" />
      {/* tail */}
      <path d="M21.2 9.6c1.3.4 2 1.7 1.4 2.9l-1.1-.5c.3-.6 0-1.2-.6-1.4Z" />
    </svg>
  );
}

export function PartyMark({ party }: { party: Party }) {
  return (
    <span className={`party-mark party-mark--${party}`} role="img" aria-label={LABEL[party]}>
      {party === 'dem' ? <Donkey /> : <Elephant />}
    </span>
  );
}

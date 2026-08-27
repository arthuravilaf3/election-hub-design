// MOCK county subdivisions. Real county geometry would be megabytes of
// GeoJSON; the prototype needs the READ (a state divides into named units
// when you get close), not cartographic truth. Each state gets a
// deterministic Voronoi partition: seeds hashed from the state id, placed
// inside the silhouette (isPointInFill), cells cut by perpendicular-
// bisector half-planes and clipped to the silhouette via SVG clipPath at
// render time. Labels are county-name initials from a pool of the most
// common US county names.

export interface CountyCell {
  /** SVG polygon points attribute. */
  points: string;
  /** Label anchor (the seed — guaranteed inside the state). */
  x: number;
  y: number;
  initials: string;
  name: string;
}

const COUNTY_NAMES = [
  'Washington', 'Franklin', 'Jefferson', 'Jackson', 'Lincoln', 'Madison',
  'Clay', 'Montgomery', 'Marion', 'Union', 'Monroe', 'Wayne', 'Grant',
  'Adams', 'Warren', 'Greene', 'Douglas', 'Polk', 'Lake', 'Carroll',
  'Perry', 'Morgan', 'Clark', 'Hamilton',
];

/** Deterministic PRNG (mulberry32) seeded from a string. */
function rng(seedStr: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Pt = { x: number; y: number };

/** Sutherland–Hodgman: keep the part of `poly` on seed A's side of the
 *  perpendicular bisector between A and B. */
function clipHalfPlane(poly: Pt[], a: Pt, b: Pt): Pt[] {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // inside(p) <= 0  ⇔  p closer to A than B
  const side = (p: Pt) => (p.x - mx) * dx + (p.y - my) * dy;
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const nxt = poly[(i + 1) % poly.length];
    const cs = side(cur);
    const ns = side(nxt);
    if (cs <= 0) out.push(cur);
    if ((cs <= 0) !== (ns <= 0)) {
      const t = cs / (cs - ns);
      out.push({ x: cur.x + t * (nxt.x - cur.x), y: cur.y + t * (nxt.y - cur.y) });
    }
  }
  return out;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Build the mock counties for one state. `contains` tests silhouette
 * membership (SVGGeometryElement.isPointInFill wrapped by the caller).
 */
export function buildCounties(
  stateId: string,
  box: Box,
  contains: (x: number, y: number) => boolean
): CountyCell[] {
  const rand = rng(`counties:${stateId}`);
  // Seed count scales with area — big states read as many counties.
  const target = Math.max(5, Math.min(24, Math.round((box.w * box.h) / 1500)));

  const seeds: Pt[] = [];
  // Rejection-sample inside the silhouette; deterministic order.
  for (let tries = 0; tries < target * 60 && seeds.length < target; tries++) {
    const p = { x: box.x + rand() * box.w, y: box.y + rand() * box.h };
    if (!contains(p.x, p.y)) continue;
    // Poisson-ish spacing so cells stay county-shaped, not slivers.
    const minGap = Math.min(box.w, box.h) / Math.sqrt(target) / 1.8;
    if (seeds.every((s) => Math.hypot(s.x - p.x, s.y - p.y) > minGap)) seeds.push(p);
  }

  const bboxPoly: Pt[] = [
    { x: box.x, y: box.y },
    { x: box.x + box.w, y: box.y },
    { x: box.x + box.w, y: box.y + box.h },
    { x: box.x, y: box.y + box.h },
  ];

  return seeds.map((seed, i) => {
    let cell = bboxPoly;
    for (const other of seeds) {
      if (other === seed) continue;
      cell = clipHalfPlane(cell, seed, other);
      if (cell.length === 0) break;
    }
    // i*7 mod 24 (coprime) walks the pool without repeats inside one state.
    const name = COUNTY_NAMES[(i * 7 + stateId.charCodeAt(0)) % COUNTY_NAMES.length];
    return {
      points: cell.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      x: seed.x,
      y: seed.y,
      initials: name.slice(0, 2).toUpperCase(),
      name,
    };
  });
}

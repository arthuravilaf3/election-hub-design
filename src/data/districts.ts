/**
 * House seats per state — the 2020 apportionment, which is the map in force
 * for the 2022, 2024 and 2026 elections. Sums to 435.
 *
 * The hub's House MAP still colors the curated "29 closest races" (PRD:
 * a 50-state choropleth cannot draw 435 districts). This table is what the
 * state detail view needs: the full delegation of whichever state is open.
 */
export const DISTRICT_COUNT: Record<string, number> = {
  AL: 7, AK: 1, AZ: 9, AR: 4, CA: 52, CO: 8, CT: 5, DE: 1, FL: 28, GA: 14,
  HI: 2, ID: 2, IL: 17, IN: 9, IA: 4, KS: 4, KY: 6, LA: 6, ME: 2, MD: 8,
  MA: 9, MI: 13, MN: 8, MS: 4, MO: 8, MT: 2, NE: 3, NV: 4, NH: 2, NJ: 12,
  NM: 3, NY: 26, NC: 14, ND: 1, OH: 15, OK: 5, OR: 6, PA: 17, RI: 2, SC: 7,
  SD: 1, TN: 9, TX: 38, UT: 4, VT: 1, VA: 11, WA: 10, WV: 2, WI: 8, WY: 1,
};

/** Single-seat states elect at large — there is no district number to show. */
export function isAtLarge(stateId: string): boolean {
  return DISTRICT_COUNT[stateId] === 1;
}

/** 'PA-07' — or 'WY-AL' for the at-large states. */
export function districtId(stateId: string, seat: number): string {
  return isAtLarge(stateId) ? `${stateId}-AL` : `${stateId}-${String(seat).padStart(2, '0')}`;
}

/** How the seat reads in the UI: the district number, or "At-large". */
export function districtLabel(id: string): string {
  return id.endsWith('-AL') ? 'At-large' : id;
}

/**
 * Layout metrics shared between TypeScript and the stylesheet.
 *
 * MapCard publishes these as custom properties on the card, so the CSS reads
 * the TS values rather than mirroring them, and the camera measures the
 * drawer's real box at flight time so the region it fits the state into can
 * never disagree with the stylesheet.
 */

/** Drawer width inside the map card (comp: 512 in a 1312 card). */
export const DRAWER_W = 512;

/** Its inset from the card's top/right/bottom edges (comp: 24). */
export const DRAWER_INSET = 24;

/** Camera flight (zoom in/out) — one duration for the transform and the
    dim, so the two read as one move. */
export const CAMERA_MS = 550;

/** Fallback fraction of the frame left of the drawer, used only before the
    drawer is mounted: (1312 - 512 - 24) / 1312. */
export const ZOOM_REGION_W = 1 - (DRAWER_W + DRAWER_INSET) / 1312;

/**
 * Layout metrics shared between the camera math (TS) and the stylesheet.
 *
 * These exist because two numbers used to be married by hand: the drawer's
 * width lived in index.css and the camera's "how much frame is left of the
 * drawer" fraction lived in ElectionMap as a literal. Change one, and the
 * zoomed state silently slid under the panel.
 *
 * MapCard publishes these as custom properties on the card, so the CSS reads
 * the TS values rather than mirroring them. The camera does better still: it
 * MEASURES the drawer at zoom time (see measureRegionW in ElectionMap), so a
 * responsive width or a breakpoint cannot drift. ZOOM_REGION_W below is only
 * the fallback for when the panel is not mounted.
 */

/** Drawer width inside the map card (comp: 512 in a 1312 card). */
export const DRAWER_W = 512;

/** Its inset from the card's top/right/bottom edges (comp: 24). */
export const DRAWER_INSET = 24;

/** The comp's card width — the rail (1440) minus its 64px side padding. */
export const CARD_W = 1312;

/** Fallback fraction of the frame left of the drawer. Measured in practice. */
export const ZOOM_REGION_W = (CARD_W - DRAWER_W - DRAWER_INSET) / CARD_W;

/**
 * Camera flight time. Three things are hand-matched to this and must stay
 * matched: the `animate()` call, the `zoomSettled` timer that gates county
 * labels, and the `.map-wrap` padding + `.county-layer` transitions in CSS —
 * the last two read it as --camera-ms.
 */
export const CAMERA_MS = 550;

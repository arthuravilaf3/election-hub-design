/**
 * Layout metrics shared between TypeScript and the stylesheet.
 *
 * MapCard publishes these as custom properties on the card, so the CSS reads
 * the TS values rather than mirroring them. They used to feed the camera
 * math as well (the fraction of the frame left of the drawer); the camera is
 * gone (Sep 2026 — opening a state dims the others instead of flying to it),
 * so the drawer's box is all that is left to share.
 */

/** Drawer width inside the map card (comp: 512 in a 1312 card). */
export const DRAWER_W = 512;

/** Its inset from the card's top/right/bottom edges (comp: 24). */
export const DRAWER_INSET = 24;

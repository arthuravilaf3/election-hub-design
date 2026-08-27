// Real DailyWire CDN stills (imgix). One asset serves both crops — the
// params do the work, so a square feed thumb and a 9:16 short come from the
// same original without a second upload.
//
// PLACEHOLDER PAIRING: these are real published images, deterministically
// distributed over the fixture; they illustrate the layout, they are not
// the art direction for any particular headline.
const STILLS = [
  'https://dw-wp-production.imgix.net/2026/08/GettyImages-2271132900-scaled.jpg',
  'https://dw-wp-production.imgix.net/2026/08/GettyImages-2290607182.jpg',
  'https://dw-wp-production.imgix.net/2026/08/GettyImages-2282041604.avif',
  'https://dw-wp-production.imgix.net/2026/08/Untitled-design-5.jpg',
  'https://dw-wp-production.imgix.net/2026/08/GettyImages-1835526766.jpg',
  'https://dw-wp-production.imgix.net/2026/08/GettyImages-2290913029.jpg',
  'https://dw-wp-production.imgix.net/2026/08/GettyImages-627189995.jpg',
  'https://dw-wp-production.imgix.net/2026/07/GettyImages-2284728532.jpg',
  'https://dw-wp-production.imgix.net/2026/05/GettyImages-2277164944-scaled.jpg',
  'https://dailywireplus-v2.imgix.net/images/carousel-items/a6b9664d-28f2-41ea-9e55-f12ed9981cf1.jpg',
];

/** Square crop for the feed rows; 9:16 for shorts. auto=format lets imgix
 *  serve avif/webp where the browser takes it. */
export function stillFor(index: number, shape: 'square' | 'portrait' = 'square'): string {
  const src = STILLS[index % STILLS.length];
  const crop = shape === 'square' ? 'w=480&h=480' : 'w=480&h=854';
  return `${src}?${crop}&fit=crop&auto=format`;
}

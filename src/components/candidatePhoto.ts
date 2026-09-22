// PLACEHOLDER portraits (mock-licensed stock, public/candidates/) — the same
// six faces repeat across states by design; real data brings real photos.
// Pools split by the fixture name lists' genders so photo and name agree.
import { asset } from '../data/assets';

const PHOTOS_M = ['c0', 'c2', 'c4'];
const PHOTOS_F = ['c1', 'c3', 'c5'];
const FEMALE_FIRST = new Set(['Becky', 'Laura', 'Angela', 'Sarah', 'Maria', 'Grace', 'Nancy', 'Rachel', 'Jill', 'Dana']);

export function photoFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  const pool = FEMALE_FIRST.has(name.split(' ')[0]) ? PHOTOS_F : PHOTOS_M;
  // -cut = background removed (macOS Vision), composited over the party color.
  return asset(`candidates/${pool[h % pool.length]}-cut.png`);
}

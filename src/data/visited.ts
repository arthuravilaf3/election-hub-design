// "Clicked" state for feed items. There is no article page yet, so a click
// can't navigate — instead the item keeps a visited treatment (like a
// visited link), persisted per browser via localStorage.
const KEY = 'dw-election-visited';

function load(): Set<number> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

const visited = load();

export function isVisited(id: number): boolean {
  return visited.has(id);
}

export function markVisited(id: number): void {
  visited.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...visited]));
  } catch {
    // Private mode / quota: the in-memory set still covers this visit.
  }
}

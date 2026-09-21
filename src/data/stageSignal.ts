// A one-number broadcast: the pinned stage's scroll progress, pushed to
// whoever draws inside it. Plain subscription, not React state — the stage
// paints every frame and re-rendering the tree that often is not affordable.
export interface StageSignal {
  readonly value: number;
  set(p: number): void;
  subscribe(fn: (p: number) => void): () => void;
}

export function createStageSignal(): StageSignal {
  const subs = new Set<(p: number) => void>();
  let value = 0;
  return {
    get value() {
      return value;
    },
    set(p: number) {
      value = p;
      for (const fn of subs) fn(p);
    },
    subscribe(fn: (p: number) => void) {
      subs.add(fn);
      fn(value);
      return () => {
        subs.delete(fn);
      };
    },
  };
}

/** A scene inside a chapter: the signal, and the slice of it the scene owns. */
export interface Scene {
  signal: StageSignal;
  from: number;
  to: number;
}

/** Where a scene stands, 0 → 1 across its own slice. */
export function sceneProgress(scene: Scene, p: number): number {
  return Math.min(1, Math.max(0, (p - scene.from) / (scene.to - scene.from)));
}

/** Scenes fade in and out at their edges, so the handover is a dissolve. */
export function sceneOpacity(local: number, edge = 0.12): number {
  return Math.min(1, Math.min(local, 1 - local) / edge);
}

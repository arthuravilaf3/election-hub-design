/**
 * THE MOMENT (Sep 25 2026). The night has one: the called seats cross the
 * majority. For a reader who is on the page when it happens, the page says
 * so — a line of type over a burst of confetti, and then it gets out of the
 * way.
 *
 * It fires on the TRANSITION, not on the state: landing on a page where the
 * race is already decided is news you missed, not news breaking. The one
 * exception is `?celebrate=1`, which is there so the moment can be shown
 * without sitting through the simulation.
 *
 * Reduced motion gets the line and no confetti. The canvas stops itself
 * once every piece is off the bottom, and the whole thing unmounts.
 */
import { useEffect, useRef, useState } from 'react';
import { track } from '../data/analytics';

const HOLD_MS = 6500;

/** Party red, white and a little gold — nothing borrowed from the map. */
const COLORS = ['#fc002c', '#cc003b', '#ffffff', '#ff9fa1', '#e8c14a'];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  spin: number;
  color: string;
}

function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    /* Two throws from the bottom corners, the way a real popper goes —
       a fountain from the middle reads like a screensaver. */
    const pieces: Piece[] = [];
    for (let side = 0; side < 2; side++) {
      const fromLeft = side === 0;
      for (let i = 0; i < 70; i++) {
        const spread = (Math.random() - 0.5) * 0.9;
        const power = 13 + Math.random() * 11;
        pieces.push({
          x: fromLeft ? -10 : w + 10,
          y: h + 10,
          vx: (fromLeft ? 1 : -1) * (power * (0.55 + Math.random() * 0.5)),
          vy: -power * (0.85 + Math.random() * 0.5) + spread,
          w: 6 + Math.random() * 6,
          h: 9 + Math.random() * 8,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.3,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    }

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Fixed-ish step, clamped: a backgrounded tab must not teleport them.
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      ctx.clearRect(0, 0, w, h);
      let alive = 0;
      for (const p of pieces) {
        p.vy += 0.38 * dt; // gravity
        p.vx *= 1 - 0.012 * dt; // drag
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        if (p.y - p.h > h) continue;
        alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        // A flat rectangle whose width breathes reads as a tumbling strip
        // without the cost of drawing one in 3D.
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w * Math.abs(Math.cos(p.rot)), p.h);
        ctx.restore();
      }
      if (alive > 0) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return <canvas className="celebrate-canvas" ref={ref} aria-hidden="true" />;
}

export function Celebration({ headline, onDone }: { headline: string; onDone: () => void }) {
  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    track('celebration_shown', { headline });
    const t = window.setTimeout(onDone, HOLD_MS);
    return () => window.clearTimeout(t);
  }, [onDone, headline]);

  return (
    /* role="status": it announces itself once and never takes focus. The
       whole layer ignores the pointer — the page underneath stays live. */
    <div className="celebrate" role="status">
      {!reduced && <Confetti />}
      <div className="celebrate-card">
        <p className="celebrate-eyebrow">Congratulations</p>
        <p className="celebrate-headline">{headline}</p>
        <button
          type="button"
          className="celebrate-close"
          onClick={() => {
            track('celebration_dismiss', {});
            onDone();
          }}
        >
          Keep watching
        </button>
      </div>
    </div>
  );
}

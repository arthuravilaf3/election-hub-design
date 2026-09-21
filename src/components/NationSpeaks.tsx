// "The Nation Speaks" (creative edition, Sep 18 2026): the Cosmos Waveform —
// a row of seats-coloured circles like a voice's waveform — with the line
// under it. Sits after the arc stage and before the feed.
//
// The asset is an animated webp, 1920 × 1080 on a transparent ground: the
// circles swell into bars like a voice's waveform on a 3s loop, and at their
// peaks the bars run almost the full height. So the frame keeps the whole
// height and crops only the empty sides (object-fit: cover).
import '../nation-speaks.css';
import { useEffect, useRef } from 'react';
import { asset } from '../data/assets';
import { sceneProgress, type Scene } from '../data/stageSignal';

export function NationSpeaks({ scene }: { scene?: Scene } = {}) {
  const root = useRef<HTMLElement>(null);

  /* SCENE MODE: inside the creative chapter it fades and rises on the
     chapter's own progress, and costs the page no height. */
  useEffect(() => {
    const el = root.current;
    if (!el || !scene) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    return scene.signal.subscribe((p) => {
      const local = sceneProgress(scene, p);
      // The last scene of the chapter: it fades IN and then holds, so the
      // pin never releases onto an empty frame.
      el.style.opacity = Math.min(1, local / 0.22).toFixed(3);
      el.style.transform = `translateY(${((1 - Math.min(1, local / 0.3)) * 26).toFixed(1)}px)`;
    });
  }, [scene]);

  return (
    <section
      className={`nation-speaks${scene ? ' nation-speaks--scene' : ''}`}
      ref={root}
      aria-labelledby="nation-speaks-title"
    >
      <img className="nation-speaks-wave" src={asset('cosmos-waveform.webp')} alt="" loading="lazy" decoding="async" />
      {/* Figma 11194:123883: one line of type in two colours — the call in
          the logo's red, the question in the page's ink. */}
      <h2 className="nation-speaks-title" id="nation-speaks-title">
        <span className="nation-speaks-call">The Nation Speaks.</span> Can you predict their voices?
      </h2>
    </section>
  );
}

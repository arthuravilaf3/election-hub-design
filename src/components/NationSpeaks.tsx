// "The Nation Speaks" (creative edition, Sep 18 2026): the Cosmos Waveform —
// a row of seats-coloured circles like a voice's waveform — with the line
// under it. Sits after the arc stage and before the feed.
//
// The asset is an animated webp, 1920 × 1080 on a transparent ground: the
// circles swell into bars like a voice's waveform on a 3s loop, and at their
// peaks the bars run almost the full height. So the frame keeps the whole
// height and crops only the empty sides (object-fit: cover).
import '../nation-speaks.css';
import { asset } from '../data/assets';

export function NationSpeaks() {
  return (
    <section className="nation-speaks" aria-labelledby="nation-speaks-title">
      <img className="nation-speaks-wave" src={asset('cosmos-waveform.webp')} alt="" loading="lazy" decoding="async" />
      <h2 className="nation-speaks-title" id="nation-speaks-title">
        The Nation Speaks. Can you predict their voices?
      </h2>
    </section>
  );
}

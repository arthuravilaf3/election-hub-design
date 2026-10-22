/**
 * Prototype chrome, not design (Oct 22 2026): serves or withholds the
 * Polymarket wallpaper. "Off" is not a mock of the failure state — it IS the
 * page with no ad served, which is what UXD-469 asks the design to survive.
 */
import type { AdState } from './takeover';

const OPTIONS: Array<{ value: AdState; label: string }> = [
  { value: 'on', label: 'Served' },
  { value: 'off', label: 'Not served' },
];

interface TakeoverSwitchProps {
  ad: AdState;
  onChange: (next: AdState) => void;
}

export function TakeoverSwitch({ ad, onChange }: TakeoverSwitchProps) {
  return (
    <div className="stream-switch" role="group" aria-label="Prototype: Polymarket wallpaper">
      <span className="stream-switch-label">Wallpaper</span>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className="stream-switch-btn"
          aria-pressed={ad === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Demo chrome: picks which nav identity exploration is on screen. Sits with
// the phase/theme/preview controls in the bottom-right stack and hides
// inside the mobile preview frame.
import { NAV_VARIANTS, NAV_VARIANT_LABEL, rememberNavVariant, type NavVariant } from '../data/navVariants';
import { IS_PREVIEW_FRAME } from './MobilePreview';

interface NavSwitcherProps {
  variant: NavVariant;
  onVariant: (v: NavVariant) => void;
}

export function NavSwitcher({ variant, onVariant }: NavSwitcherProps) {
  if (IS_PREVIEW_FRAME) return null;
  return (
    <aside className="nav-switcher" aria-label="Nav exploration">
      <label className="phase-switcher-label" htmlFor="nav-variant">
        Nav
      </label>
      <select
        id="nav-variant"
        className="nav-switcher-select"
        value={variant}
        onChange={(e) => {
          const v = e.target.value as NavVariant;
          rememberNavVariant(v);
          onVariant(v);
        }}
      >
        {NAV_VARIANTS.map((v) => (
          <option key={v} value={v}>
            {NAV_VARIANT_LABEL[v]}
          </option>
        ))}
      </select>
    </aside>
  );
}

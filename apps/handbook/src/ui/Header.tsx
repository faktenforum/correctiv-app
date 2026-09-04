import type { Appearance } from '../theme';
import { href } from '../router';

interface Props {
  appearance: Appearance;
  onAppearance: (next: Appearance) => void;
  onSearch: () => void;
  onMenu: () => void;
  /** False on the landing page, which has no sidebar to open. */
  hasSidebar: boolean;
}

const MODES: { value: Appearance; label: string; glyph: string }[] = [
  { value: 'light', label: 'Light', glyph: '☀' },
  { value: 'dark', label: 'Dark', glyph: '☾' },
  { value: 'system', label: 'System', glyph: '◐' },
];

/**
 * The one piece of chrome every page carries.
 *
 * Two designs arrived with two headers, and this is the documentation one,
 * because it was drawn as chrome rather than as the top of a particular page.
 * The landing page sits under it with `hasSidebar` false.
 */
export function Header({ appearance, onAppearance, onSearch, onMenu, hasSidebar }: Props) {
  return (
    <header className="header">
      {hasSidebar && (
        <button
          className="menu-btn"
          id="menu-btn"
          type="button"
          aria-label="Open navigation"
          onClick={onMenu}
        >
          <span aria-hidden="true">☰</span>
        </button>
      )}

      <a className="brand" href={href('/')}>
        <span className="mark" aria-hidden="true" />
        CORRECTIV
        <span className="sub">Handbook</span>
      </a>

      <span className="header-spacer" />

      <button
        className="search-btn"
        type="button"
        aria-label="Search the documentation"
        onClick={onSearch}
      >
        <span className="label">Search</span>
        <span className="keys">
          <kbd className="mod">⌘</kbd>
          <kbd>K</kbd>
        </span>
      </button>

      <div className="theme" role="radiogroup" aria-label="Appearance">
        {MODES.map((mode, i) => (
          <button
            key={mode.value}
            role="radio"
            type="button"
            aria-checked={appearance === mode.value}
            // Roving tabindex: the group is one tab stop, and the arrows move
            // within it, which is what a radiogroup promises a keyboard user.
            tabIndex={appearance === mode.value ? 0 : -1}
            onClick={() => onAppearance(mode.value)}
            onKeyDown={(event) => {
              const step =
                event.key === 'ArrowRight' || event.key === 'ArrowDown'
                  ? 1
                  : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                    ? -1
                    : 0;
              if (step === 0) return;
              event.preventDefault();
              onAppearance(MODES[(i + step + MODES.length) % MODES.length].value);
            }}
          >
            <span aria-hidden="true">{mode.glyph}</span>
            <span className="vh">{mode.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
}

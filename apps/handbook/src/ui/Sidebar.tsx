import { href } from '../router';
import { NAV } from '../nav';

interface Props {
  route: string;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ route, open, onClose }: Props) {
  return (
    <>
      <button
        className="scrim"
        id="scrim"
        type="button"
        aria-label="Close navigation"
        hidden={!open}
        onClick={onClose}
      />
      <nav className="sidebar" id="sidebar" aria-label="Site" data-open={open ? 'true' : undefined}>
        <div className="nav">
          {NAV.map((group) => (
            <details
              className="group"
              key={group.label}
              open={group.open || group.items.some((i) => i.route === route)}
            >
              <summary>{group.label}</summary>
              <ul>
                {group.items.map((item) => (
                  <li key={item.route}>
                    <a
                      className={item.number ? 'row' : 'row plain'}
                      href={href(item.route)}
                      title={item.label}
                      aria-current={item.route === route ? 'page' : undefined}
                    >
                      {item.number && <span className="num">{item.number}</span>}
                      <span className="ttl">{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
              {group.label === 'Decisions' && (
                <p className="legend">
                  A record is never rewritten. A claim a later decision made false is struck through
                  where it stands.
                </p>
              )}
            </details>
          ))}
        </div>
      </nav>
    </>
  );
}

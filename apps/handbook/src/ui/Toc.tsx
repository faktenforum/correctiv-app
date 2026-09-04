import { useEffect, useMemo, useState } from 'react';

import type { Heading } from '../../plugin/markdown';

interface Props {
  headings: Heading[];
}

/**
 * The in-page table of contents, following the heading currently on screen.
 *
 * Only h2 and h3: an h4 in these documents is a detail inside an argument, and
 * listing them turns a map into a transcript. The observer's top margin keeps a
 * heading "current" while its section is being read rather than only while the
 * heading itself is visible.
 */
export function Toc({ headings }: Props) {
  const shown = useMemo(() => headings.filter((h) => h.depth === 2 || h.depth === 3), [headings]);
  const [active, setActive] = useState<string | null>(shown[0]?.id ?? null);

  useEffect(() => {
    if (shown.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px' },
    );
    for (const heading of shown) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [shown]);

  if (shown.length < 2) return <aside className="toc" aria-label="On this page" />;

  return (
    <aside className="toc" aria-label="On this page">
      <p className="toc-label">On this page</p>
      <ul>
        {shown.map((heading) => (
          <li key={heading.id} data-depth={heading.depth}>
            <a href={`#${heading.id}`} aria-current={heading.id === active ? 'true' : undefined}>
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

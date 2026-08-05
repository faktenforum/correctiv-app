import { useEffect, useState } from 'react';

import { fetchOgImage } from './ogImage';

/**
 * Lädt das Titelbild (og:image) einer Artikelseite nach, sofern nicht schon
 * bekannt. Feeds liefern keine Bilder; das Laden ist cache-first und idempotent.
 */
export function useOgImage(articleUrl: string, initial?: string): string | undefined {
  const [fetched, setFetched] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initial) return; // schon vorhanden — kein Nachladen nötig
    let active = true;
    fetchOgImage(articleUrl).then((found) => {
      if (active && found) setFetched(found);
    });
    return () => {
      active = false;
    };
  }, [articleUrl, initial]);

  return initial ?? fetched;
}

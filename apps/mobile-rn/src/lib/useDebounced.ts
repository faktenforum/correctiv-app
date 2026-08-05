import { useEffect, useState } from 'react';

/**
 * `value`, sobald es sich `delayMs` lang nicht mehr geändert hat.
 *
 * Damit tippt die Suche nicht pro Tastendruck eine Anfrage. Der Timer hängt am
 * Effekt, wird also beim nächsten Zeichen und beim Unmount aufgeräumt — anders
 * als die frühere Variante mit einem Modul-Timer, die nach dem Verlassen des
 * Bildschirms noch einmal gefeuert hätte.
 */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}

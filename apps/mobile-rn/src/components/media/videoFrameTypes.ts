/**
 * Ein Vertrag für beide Plattform-Varianten von `VideoFrame`. Beide importieren
 * ihn, statt eigene Props zu deklarieren — sonst können native und Web-Fassung
 * still auseinanderlaufen (derselbe Grund wie bei components/reader/types.ts).
 */
export type VideoFrameProps = {
  /** Einbettungs-URL, z. B. https://www.youtube-nocookie.com/embed/<id>. */
  uri: string;
  className?: string;
};

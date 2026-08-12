/**
 * One contract for both platform variants of `VideoFrame`. Both import it instead
 * of declaring their own props — otherwise the native and web branches can drift
 * apart silently (the same reason as in components/reader/types.ts).
 */
export type VideoFrameProps = {
  /** Einbettungs-URL, z. B. https://www.youtube-nocookie.com/embed/<id>. */
  uri: string;
  className?: string;
};

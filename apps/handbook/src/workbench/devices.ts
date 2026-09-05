/** Portrait CSS pixels. Kept verbatim from the shell this package replaces. */
export interface Device {
  id: string;
  label: string;
  w: number;
  h: number;
}

/**
 * 768 is not a device. It is the reader's 48rem breakpoint
 * (`packages/design-tokens/src/reader.generated.ts`), worth being able to sit
 * exactly on.
 */
export const DEVICES: Device[] = [
  // Sizeless on purpose: the box it is given IS the size, measured. Everything
  // that reads a width goes through `frameSize`, which asks the stage for this
  // one rather than looking it up here.
  { id: 'host', label: 'This screen, full size', w: 0, h: 0 },
  { id: 'iphone-se', label: 'iPhone SE', w: 375, h: 667 },
  { id: 'iphone-15-pro', label: 'iPhone 15 Pro', w: 393, h: 852 },
  { id: 'pixel-8', label: 'Pixel 8', w: 412, h: 915 },
  { id: 'breakpoint', label: 'Tablet breakpoint (48rem)', w: 768, h: 1024 },
  { id: 'ipad-mini', label: 'iPad mini', w: 744, h: 1133 },
  { id: 'ipad-pro-11', label: 'iPad Pro 11"', w: 834, h: 1194 },
  { id: 'custom', label: 'Custom', w: 0, h: 0 },
];

export const DEFAULT_DEVICE = 'iphone-15-pro';

/** The id whose size is the host's own, so nothing may look it up in `DEVICES`. */
export const HOST_DEVICE = 'host';

/**
 * Below this, a phone drawn inside the page is smaller than the page.
 *
 * At 390 CSS pixels the frame fitted at 40%: an app rendered a quarter of its
 * intended size, inside a device frame, on a device. A tablet in portrait is 744
 * to 834 wide and has the same problem with less of it, so the line is above
 * both and below the narrowest desktop window anybody works in.
 */
export const HOST_BELOW = 1024;

/**
 * What to show when the address named no device.
 *
 * A link that names one always wins, because that is what the link is for. This
 * only decides the first view of `/workbench` with nothing after the hash.
 */
export function defaultDevice(): string {
  return window.innerWidth < HOST_BELOW ? HOST_DEVICE : DEFAULT_DEVICE;
}

/**
 * And whether the shell's own chrome starts out of the way.
 *
 * Same line, same reason. On a screen this size the header, the rail, two
 * sidebars and a status line are most of what there is, and the app is what
 * somebody opened this address for. One floating button brings them back.
 */
export function defaultFull(): boolean {
  return window.innerWidth < HOST_BELOW;
}

export function preset(id: string): Device {
  return DEVICES.find((d) => d.id === id) ?? DEVICES.find((d) => d.id === DEFAULT_DEVICE)!;
}

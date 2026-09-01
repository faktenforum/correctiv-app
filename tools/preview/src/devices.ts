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
  { id: 'iphone-se', label: 'iPhone SE', w: 375, h: 667 },
  { id: 'iphone-15-pro', label: 'iPhone 15 Pro', w: 393, h: 852 },
  { id: 'pixel-8', label: 'Pixel 8', w: 412, h: 915 },
  { id: 'breakpoint', label: 'Tablet breakpoint (48rem)', w: 768, h: 1024 },
  { id: 'ipad-mini', label: 'iPad mini', w: 744, h: 1133 },
  { id: 'ipad-pro-11', label: 'iPad Pro 11"', w: 834, h: 1194 },
  { id: 'custom', label: 'Custom', w: 0, h: 0 },
];

export const DEFAULT_DEVICE = 'iphone-15-pro';

export function preset(id: string): Device {
  return DEVICES.find((d) => d.id === id) ?? DEVICES.find((d) => d.id === DEFAULT_DEVICE)!;
}

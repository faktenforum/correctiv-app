import type { MembershipTier } from '@correctiv/app-core/types/models';

/**
 * The membership tiers, as the app names them to a reader.
 *
 * Shared rather than kept per screen, which is the exception to "user-facing text
 * lives in one obvious place per screen": these three strings are the names of a
 * domain enum, the door and the profile both print them, and two copies of an enum's
 * labels drift the moment a tier is renamed.
 */
export const TIER_LABELS: Record<MembershipTier, string> = {
  free: 'Kostenlose Mitgliedschaft',
  paid: 'Mitgliedschaft mit Beitrag',
  soli: 'Soli-Mitgliedschaft',
};

import type { Callout } from '@correctiv/app-core/data/callouts';

export type CalloutStyle = {
  /** Kicker above the title. */
  kicker: string;
  /** Button label. */
  cta: string;
  /** How loud the button is: a survey asks less than a CrowdNewsroom. */
  variant: 'primary' | 'outline';
  /** What the counter counts. */
  unit: string;
};

/**
 * How a callout presents itself, from its kind.
 *
 * Two places need the same answer — the card on Mitmachen and the module on Home —
 * and the draft ties three decisions to that one fact: what the kicker says, what
 * the button says, and how much weight the button carries. Written out separately
 * in two files they would be two truths free to drift apart, which is how all three
 * callouts ended up labelled CROWDNEWSROOM with the same loud coral button.
 */
export function calloutStyle(callout: Callout): CalloutStyle {
  if (callout.kind === 'survey') {
    return { kicker: 'Umfrage', cta: 'Teilnehmen', variant: 'outline', unit: 'Teilnahmen' };
  }
  return { kicker: 'CrowdNewsroom', cta: 'Mitmachen', variant: 'primary', unit: 'Beiträge' };
}

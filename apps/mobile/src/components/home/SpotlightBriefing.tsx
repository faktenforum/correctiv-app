import { Pressable, View } from 'react-native';

import type { SpotlightIssue } from '@correctiv/app-core/data/spotlight';
import { formatDateShortDe } from '@correctiv/app-core/lib/format';

import { Card, Hairline, Overline, Typo } from '@/components/ui';
import { openExternal } from '@/lib/openExternal';
import { useSpotlight } from '@/lib/store/core';

/**
 * Spotlight on Home: the last three issues, by date and subject.
 *
 * The draft's card was an agenda of one morning, "06:58" beside a headline, and
 * this component rendered exactly that off invented data. The archive turns out to
 * be public (`wp/v2/newspack_nl_cpt`, 523 issues), and a real issue has no timed
 * entries: it is one subject and one lead. So the card is still a scannable index
 * with a small bold label on the left, and the label is now a date instead of a
 * clock. Three real days beat five invented hours.
 *
 * Tapping opens the issue on correctiv.org rather than in the reader, because a
 * newsletter's body is the sent email, tables and masthead GIF included. See
 * `data/spotlight.ts`.
 */
export function SpotlightBriefing({ onOpenArchive }: { onOpenArchive: () => void }) {
  const { recent, status } = useSpotlight(3);

  // Nothing to show and nothing said: the card would be an empty box. The first
  // load resolves from the seed at worst, so this is the very first paint only.
  if (recent.length === 0) return null;

  return (
    <Card tone="surface">
      <View className="flex-row items-center justify-between">
        <Overline label="Spotlight" color="on-canvas" />
        <Pressable
          onPress={onOpenArchive}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel="Alle Spotlight-Ausgaben"
          className="active:opacity-60"
        >
          <Typo variant="text-s" weight="bold" color="accent">
            Alle Ausgaben →
          </Typo>
        </Pressable>
      </View>

      {recent.map((issue) => (
        <IssueRow key={issue.id} issue={issue} />
      ))}

      {status === 'offline' && (
        <Typo variant="text-s" color="grey-500" className="mt-s">
          Ohne Verbindung. Sie sehen gespeicherte Ausgaben.
        </Typo>
      )}
    </Card>
  );
}

function IssueRow({ issue }: { issue: SpotlightIssue }) {
  return (
    <View>
      {/* A hairline above every row, including the first — it separates the
          index from its own header, as in the draft. */}
      <Hairline className="mt-s" />
      <Pressable
        onPress={() => openExternal(issue.url)}
        accessibilityRole="link"
        accessibilityLabel={issue.subject}
        className="flex-row gap-s pt-s active:opacity-70"
      >
        <Typo variant="text-s" weight="bold" color="on-canvas-muted">
          {formatDateShortDe(issue.date)}
        </Typo>
        <Typo variant="text-m" numberOfLines={2} className="flex-1">
          {issue.subject}
        </Typo>
      </Pressable>
    </View>
  );
}

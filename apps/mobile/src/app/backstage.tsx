import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Badge, Button, Card, Overline, ScreenHeader, Typo } from '@/components/ui';
import {
  clubNewsletter,
  diaries,
  earlyAccess,
  events,
  qa,
  verlagPerk,
  type DiaryEntry,
} from '@correctiv/app-core/data/backstage';
import { formatDateShortDe } from '@correctiv/app-core/lib/format';
import { openArticle } from '@/lib/openArticle';
import { openExternal } from '@/lib/openExternal';
import { useColors } from '@/lib/theme';

/**
 * Backstage — early access, the research diary, the club letter, the Q&A, events,
 * the publishing house.
 *
 * Nothing here is locked, and that has not changed: the rule was and is that the club
 * is closeness rather than a paywall. What has gone is the second copy for a guest,
 * because since the door (ADR 0016) there is no guest to tease. Removed with ADR 0018.
 */
export default function BackstageScreen() {
  return (
    <View className="flex-1 bg-grey-100">
      <ScreenHeader />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-m pt-m pb-2xl"
        showsVerticalScrollIndicator={false}
      >
        <Badge label="Club" tone="club" />
        <Typo variant="headline-xl" className="mt-s">
          Backstage
        </Typo>

        <View className="mt-l">
          <Overline label="Früher lesen" color="emphasis" />
          <Card className="mt-2xs">
            <Typo variant="headline-xs">{earlyAccess.title}</Typo>
            <Typo variant="text-s" color="grey-600" className="mt-2xs">
              {earlyAccess.teaser}
            </Typo>
            <Typo variant="text-s" color="grey-500" className="mt-s">
              Für alle ab {earlyAccess.publicFromLabel}
            </Typo>
            <Button
              title="Jetzt lesen"
              className="mt-s"
              onPress={() => openArticle({ url: earlyAccess.articleUrl, title: earlyAccess.title })}
            />
          </Card>
        </View>

        <View className="mt-m">
          <Overline label="Recherchetagebuch" />
          <View className="mt-2xs">
            {diaries.map((entry) => (
              <DiaryRow key={entry.id} entry={entry} />
            ))}
          </View>
        </View>

        <View className="mt-m">
          <Overline label="Backstage-Brief" />
          <Card tone="surface" className="mt-2xs">
            <Typo variant="headline-xs">{clubNewsletter.subject}</Typo>
            <Typo variant="text-s" color="grey-500" className="mt-4xs">
              {formatDateShortDe(clubNewsletter.date)}
            </Typo>
            {clubNewsletter.paragraphs.map((paragraph) => (
              <Typo key={paragraph.slice(0, 24)} variant="text-s" className="mt-s">
                {paragraph}
              </Typo>
            ))}
          </Card>
        </View>

        <View className="mt-m">
          <Overline label="Fragerunde" />
          <Card className="mt-2xs">
            <Typo variant="headline-xs">{qa.title}</Typo>
            <Typo variant="text-s" color="grey-600" className="mt-2xs">
              {qa.description}
            </Typo>
            <Typo variant="text-s" color="emphasis" className="mt-s">
              {qa.deadlineLabel}
            </Typo>
          </Card>
        </View>

        <View className="mt-m">
          <Overline label="Termine" />
          {events.map((event) => (
            <Card key={event.id} className="mt-2xs">
              <Typo variant="headline-xs">{event.title}</Typo>
              <Typo variant="text-s" color="grey-500" className="mt-4xs">
                {formatDateShortDe(event.date)} · {event.location}
              </Typo>
              <Typo variant="text-s" color="grey-600" className="mt-2xs">
                {event.description}
              </Typo>
            </Card>
          ))}
        </View>

        <View className="mt-m">
          <Overline label="Verlag" />
          <Card tone="surface" className="mt-2xs">
            <Typo variant="headline-xs">{verlagPerk.title}</Typo>
            <Typo variant="text-s" color="grey-600" className="mt-2xs">
              {verlagPerk.description}
            </Typo>
            <Button
              title="Zum Shop"
              variant="outline"
              className="mt-s"
              onPress={() => openExternal(verlagPerk.shopUrl)}
            />
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

function DiaryRow({ entry }: { entry: DiaryEntry }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={entry.title}
      onPress={() => router.push({ pathname: '/tagebuch/[id]', params: { id: entry.id } })}
      className="flex-row items-center border-b border-grey-300 py-s active:opacity-70"
    >
      <View className="flex-1 pr-s">
        <Overline label={entry.series} />
        <Typo variant="text-m" weight="bold" className="mt-4xs">
          {entry.title}
        </Typo>
        <Typo variant="text-s" color="grey-600" numberOfLines={2} className="mt-4xs">
          {entry.teaser}
        </Typo>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors['grey-500']} />
    </Pressable>
  );
}

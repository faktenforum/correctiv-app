import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, View } from 'react-native';

import { Overline, ScreenHeader, Typo } from '@/components/ui';
import { formatDateShortDe } from '@correctiv/app-core/lib/format';
import type { SavedArticle } from '@correctiv/app-core/stores/savedArticles';
import { openArticle } from '@/lib/openArticle';
import { coreActions, useSavedArticles } from '@/lib/store/core';
import { sizes, useColors } from '@/lib/theme';

/**
 * Saved articles — the same list the bookmark in the reader fills. `savedArticles`
 * in the core, persisted, so it survives a restart.
 */
export default function GespeichertScreen() {
  const items = useSavedArticles();

  return (
    <View className="flex-1 bg-grey-100">
      <ScreenHeader />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-m pt-m pb-2xl"
        showsVerticalScrollIndicator={false}
      >
        <Typo variant="headline-l">Gespeicherte Artikel</Typo>

        {items.length === 0 ? (
          <Typo variant="text-m" color="grey-600" className="mt-m">
            Noch nichts gespeichert. Tippen Sie im Artikel auf das Lesezeichen, um ihn hier
            abzulegen.
          </Typo>
        ) : (
          <View className="mt-s">
            {items.map((article) => (
              <SavedRow key={article.url} article={article} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SavedRow({ article }: { article: SavedArticle }) {
  const colors = useColors();
  return (
    <View className="flex-row items-start border-b border-grey-300 py-s">
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={article.title}
        onPress={() => openArticle(article)}
        className="flex-1 pr-s active:opacity-70"
      >
        {article.kicker && <Overline label={article.kicker} color="emphasis" />}
        <Typo variant="text-m" weight="bold" numberOfLines={2} className="mt-4xs">
          {article.title}
        </Typo>
        <Typo variant="text-s" color="grey-500" className="mt-2xs">
          gespeichert {formatDateShortDe(article.savedAt)}
        </Typo>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${article.title} entfernen`}
        hitSlop={8}
        onPress={() => coreActions.savedArticles.remove(article.url)}
        className="items-center justify-center active:opacity-70"
        style={{ width: sizes.iconButtonSmall, height: sizes.iconButtonSmall }}
      >
        <Ionicons name="close" size={18} color={colors['grey-500']} />
      </Pressable>
    </View>
  );
}

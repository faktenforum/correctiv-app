import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReaderView } from '@/components/reader/ReaderView';
import { Typo } from '@/components/ui';
import { loadArticle } from '@/lib/articles/loadArticle';
import { buildReaderHtml, type ReaderArticle } from '@/lib/articles/readerHtml';
import { coreActions, useIsSaved } from '@/lib/store/core';
import { colors } from '@/lib/theme';

/**
 * Artikel-Reader: Voll-Seiten-WebView mit bereinigtem Artikel-HTML (Token-CSS +
 * eingebettete Fonts, offline-fähig). Nativer Overlay-Header (Zurück/Speichern).
 * Links werden abgefangen: correctiv.org-Artikel → neuer Reader, correctiv://join →
 * Beitritts-Flow (M5), externe Links → System-Browser.
 */
export default function ArtikelScreen() {
  const { url, title, badge } = useLocalSearchParams<{
    url?: string;
    title?: string;
    badge?: string;
  }>();
  const [article, setArticle] = useState<ReaderArticle | null>(null);
  const [error, setError] = useState(false);
  // Subscribes to just this one article's saved flag, so bookmarking another
  // article does not re-render the reader.
  const saved = useIsSaved(url ?? '');

  useEffect(() => {
    if (!url) return;
    let active = true;
    const load = async () => {
      setArticle(null);
      setError(false);
      try {
        const a = await loadArticle(url, badge);
        if (active) setArticle(a);
      } catch {
        if (active) setError(true);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [url, badge]);

  const onNavigate = (target: string): boolean => {
    if (target === 'about:blank' || target.startsWith('data:') || target.startsWith('file:'))
      return true;
    if (target.startsWith('correctiv://join')) {
      router.push('/(tabs)/profil');
      return false;
    }
    // Interne Artikel-Links → neuer Reader-Push.
    if (/^https:\/\/correctiv\.org\/.+\/\d{4}\/\d{2}\/\d{2}\//.test(target)) {
      router.push({ pathname: '/artikel', params: { url: target } });
      return false;
    }
    // Übrige externe Links → System-Browser.
    if (/^https?:/.test(target)) {
      Linking.openURL(target);
      return false;
    }
    return true;
  };

  return (
    <View className="flex-1 bg-grey-100">
      {article ? (
        <ReaderView html={buildReaderHtml(article)} onNavigate={onNavigate} />
      ) : (
        <View className="flex-1 items-center justify-center px-m">
          {error ? (
            <>
              <Typo variant="headline-s" className="text-center">
                Artikel konnte nicht geladen werden
              </Typo>
              <Typo variant="text-m" color="grey-600" className="mt-2xs text-center">
                {title ?? 'Bitte später erneut versuchen.'}
              </Typo>
            </>
          ) : (
            <ActivityIndicator color={colors.emphasis} />
          )}
        </View>
      )}

      {/* Transparenter Overlay-Header */}
      <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0">
        <View className="flex-row items-center justify-between px-s py-2xs">
          <HeaderButton icon="chevron-back" onPress={() => router.back()} />
          {url && (
            <HeaderButton
              icon={saved ? 'bookmark' : 'bookmark-outline'}
              onPress={() =>
                coreActions.savedArticles().toggle({
                  url,
                  title: title ?? article?.title ?? '',
                  topline: article?.badge ?? null,
                  rating: article?.rating ?? null,
                  savedAt: new Date().toISOString(),
                })
              }
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function HeaderButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-full bg-grey-100 active:opacity-70"
      style={{ opacity: 0.92 }}
    >
      <Ionicons name={icon} size={22} color={colors['grey-700']} />
    </Pressable>
  );
}

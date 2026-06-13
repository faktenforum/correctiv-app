import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typo } from '@/components/ui';
import { colors } from '@/lib/theme';

/**
 * Artikel-Reader (Platzhalter, wird in M2 zur Voll-Seiten-WebView mit bereinigtem
 * Artikel-HTML ausgebaut). Erhält die Artikel-URL als Param.
 */
export default function ArtikelScreen() {
  const { url, title } = useLocalSearchParams<{ url?: string; title?: string }>();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-grey-100">
      <View className="flex-row items-center px-s py-2xs">
        <Pressable onPress={() => router.back()} hitSlop={8} className="p-2xs active:opacity-60">
          <Ionicons name="chevron-back" size={26} color={colors['grey-700']} />
        </Pressable>
      </View>
      <View className="flex-1 justify-center px-m">
        <Typo variant="headline-l">{title ?? 'Artikel'}</Typo>
        <Typo variant="text-m" color="grey-600" className="mt-s">
          Der Volltext-Reader (Voll-Seiten-WebView mit bereinigtem Artikel-HTML) folgt in M2.
        </Typo>
        {url && (
          <Typo variant="text-s" color="grey-500" className="mt-m">
            {url}
          </Typo>
        )}
      </View>
    </SafeAreaView>
  );
}

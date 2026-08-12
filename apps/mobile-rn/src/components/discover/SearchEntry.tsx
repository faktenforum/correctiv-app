import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { Typo } from '@/components/ui';
import { useColors } from '@/lib/theme';

/**
 * The search entry point on Entdecken — a dummy that pushes /suche, not an input.
 * Exactly as in the design draft: the keyboard should only come up on the search
 * screen, so that the directory stays visible when the tab is opened.
 */
export function SearchEntry({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Suche öffnen"
      className="flex-row items-center rounded-md bg-grey-200 px-s active:opacity-80"
      style={{ height: 44 }}
    >
      <Ionicons name="search" size={18} color={colors['grey-600']} />
      <Typo variant="text-m" color="grey-500" className="ml-xs">
        Recherchen, Faktenchecks, Projekte …
      </Typo>
    </Pressable>
  );
}

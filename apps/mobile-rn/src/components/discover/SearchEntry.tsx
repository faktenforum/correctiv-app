import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { Typo } from '@/components/ui';
import { colors } from '@/lib/theme';

/**
 * Der Sucheinstieg auf Entdecken — eine Attrappe, die auf /suche schiebt, kein
 * Eingabefeld. Genau so im Designentwurf: die Tastatur soll erst auf dem
 * Suchbildschirm aufgehen, damit das Verzeichnis beim Betreten sichtbar bleibt.
 */
export function SearchEntry({ onPress }: { onPress: () => void }) {
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

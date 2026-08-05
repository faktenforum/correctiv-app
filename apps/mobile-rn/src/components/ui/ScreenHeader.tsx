import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Hairline } from './Hairline';
import { Typo } from './Typo';
import { colors } from '@/lib/theme';

export type ScreenHeaderProps = {
  onBack: () => void;
  /**
   * Beschriftung der Zurück-Steuerung. „Abbrechen" im Formular, weil dort ein
   * zweiter „Zurück"-Knopf einen Schritt zurückgeht — zwei gleich benannte Knöpfe
   * mit verschiedener Bedeutung wären eine Falle.
   */
  backLabel?: string;
  /**
   * Rechts neben der Zurück-Steuerung (das Suchfeld auf /suche). Ist etwas
   * gesetzt, schrumpft Zurück auf das Chevron — sonst reicht die Zeile nicht.
   */
  children?: ReactNode;
};

/**
 * Zurück-Leiste mit Hairline, wie im Designentwurf (Chevron + „Zurück", keine
 * Titelzeile). Bewusst KEIN nativer Stack-Header: die App setzt durchgehend
 * `headerShown: false` und baut ihre Kopfzeilen selbst, damit iOS, Android und
 * Web dieselbe Marke zeigen — ein nativer Header sieht auf jeder Plattform
 * anders aus und auf Web gar nicht.
 */
export function ScreenHeader({ onBack, backLabel = 'Zurück', children }: ScreenHeaderProps) {
  return (
    <SafeAreaView edges={['top']} className="bg-grey-100">
      <View className="flex-row items-center px-s py-2xs">
        <Pressable
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          className="flex-row items-center py-2xs active:opacity-60"
        >
          <Ionicons name="chevron-back" size={20} color={colors['grey-700']} />
          {!children && (
            <Typo variant="text-m" weight="semibold" className="ml-4xs">
              {backLabel}
            </Typo>
          )}
        </Pressable>
        {children && <View className="ml-2xs flex-1">{children}</View>}
      </View>
      <Hairline />
    </SafeAreaView>
  );
}

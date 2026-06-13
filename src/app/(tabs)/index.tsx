import { View } from 'react-native';

import { Badge, Button, Card, Hairline, Screen, Typo } from '@/components/ui';

/**
 * M0-Platzhalter für Home: zeigt die Design-System-Bausteine, um Tokens, Fonts
 * und NativeWind end-to-end zu verifizieren. Wird in M1 durch den echten Feed ersetzt.
 */
export default function HomeScreen() {
  return (
    <Screen>
      <Typo variant="headline-xl" className="mb-2xs">
        CORRECTIV
      </Typo>
      <Typo variant="text-m" color="grey-600" className="mb-m">
        Die App für alle, die CORRECTIV möglich machen.
      </Typo>

      <Hairline className="mb-m" />

      <View className="mb-m flex-row flex-wrap gap-xs">
        <Badge label="Faktencheck" tone="emphasis" />
        <Badge label="Backstage" tone="club" />
        <Badge label="Salon5 Radio" tone="live" />
        <Badge label="Klima" tone="neutral" />
      </View>

      <Card className="mb-m">
        <Typo variant="headline-m" className="mb-2xs">
          Die Perfekte Frau
        </Typo>
        <Typo variant="text-article" color="grey-600">
          Wie Autokraten ein Ideal erschaffen — eine Recherche über Macht, Körper und Ideologie.
        </Typo>
      </Card>

      <View className="gap-s">
        <Button title="Unterstützer:in werden" variant="primary" fullWidth />
        <Button title="Erstmal umsehen" variant="outline" fullWidth />
      </View>
    </Screen>
  );
}

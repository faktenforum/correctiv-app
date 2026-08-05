import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingRow } from '@/components/profile/SettingRow';
import { Button, Card, Chip, Typo } from '@/components/ui';
import { interests } from '@correctiv/app-core/data/interests';
import { coreActions, useSelectedInterests, useSettings } from '@/lib/store/core';
import { colors } from '@/lib/theme';

/** Die drei Sätze auf dem roten Missionsbildschirm. */
const MISSION = [
  'Gemeinnützig — uns gehört niemand',
  'Spendenfinanziert — von Tausenden getragen',
  'Ohne Paywall — Journalismus für alle',
];

/**
 * Onboarding: Mission → Interessen → Mitmachen/Push → Club.
 *
 * Der letzte Schritt hat **zwei gleichwertige Wege** („Unterstützer:in werden" und
 * „Erstmal umsehen"), und ab Schritt 2 steht oben rechts „Überspringen". Das ist
 * Absicht: kein Dark Pattern, und `completeOnboarding()` läuft in jedem Fall — wer
 * überspringt, wird nicht beim nächsten Start erneut gefragt.
 *
 * Der Missionsbildschirm ist markenrot und damit unabhängig vom Farbschema; die
 * folgenden Schritte laufen auf der normalen Fläche.
 */
export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const settings = useSettings();
  const selected = useSelectedInterests();
  const selectedIds = new Set(selected.map((interest) => interest.id));

  const finish = (withJoin: boolean) => {
    coreActions.settings().completeOnboarding();
    router.replace('/(tabs)');
    if (withJoin) router.push('/beitreten');
  };

  const mission = step === 0;

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      className={mission ? 'flex-1 bg-emphasis' : 'flex-1 bg-grey-100'}
    >
      <View className="flex-row items-center justify-between px-m py-s">
        <View className="flex-row gap-2xs">
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              className="rounded-full"
              style={{
                width: 7,
                height: 7,
                backgroundColor: mission
                  ? i === step
                    ? colors['grey-100']
                    : 'rgba(255,255,255,0.45)'
                  : i === step
                    ? colors.emphasis
                    : colors['grey-300'],
              }}
            />
          ))}
        </View>
        {step > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Überspringen"
            onPress={() => finish(false)}
            hitSlop={8}
            className="active:opacity-70"
          >
            <Typo variant="text-s" color="grey-600">
              Überspringen
            </Typo>
          </Pressable>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-m pt-m pb-l"
        showsVerticalScrollIndicator={false}
      >
        {mission && (
          <View className="pt-l">
            <Typo variant="headline-m" color="grey-100" style={{ letterSpacing: 2 }}>
              CORRECTIV
            </Typo>
            <Typo variant="headline-xxl" color="grey-100" className="mt-s">
              Recherchen für die Gesellschaft
            </Typo>
            <View className="mt-2xl">
              {MISSION.map((line) => (
                <View key={line} className="mt-s flex-row items-start">
                  <View
                    className="mt-1 rounded-full bg-alternative"
                    style={{ width: 8, height: 8, marginTop: 7 }}
                  />
                  <Typo variant="text-l" color="grey-100" className="ml-s flex-1">
                    {line}
                  </Typo>
                </View>
              ))}
            </View>
          </View>
        )}

        {step === 1 && (
          <>
            <Typo variant="headline-xl">Was interessiert Sie?</Typo>
            <Typo variant="text-m" color="grey-600" className="mt-2xs">
              Ihre Auswahl ordnet die Startseite — alles bleibt trotzdem zugänglich.
            </Typo>
            <View className="mt-m flex-row flex-wrap gap-2xs">
              {interests.map((interest) => (
                <Chip
                  key={interest.id}
                  label={interest.label}
                  selected={selectedIds.has(interest.id)}
                  onPress={() => coreActions.interests().toggle(interest.id)}
                />
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Typo variant="headline-xl">Recherchen, bei denen Sie mitmachen</Typo>
            <Typo variant="text-m" color="grey-600" className="mt-s">
              Im CrowdNewsroom tragen tausende Menschen zu Recherchen bei. Im Faktenforum prüft die
              Community Behauptungen. Beides finden Sie im Tab „Mitmachen".
            </Typo>
            <Card className="mt-m">
              <SettingRow
                label="Benachrichtigungen"
                description="Bei neuen Recherchen und Mitmach-Aufrufen (simuliert)"
                value={settings.pushOptIn}
                onValueChange={(value) => coreActions.settings().setPushOptIn(value)}
              />
            </Card>
          </>
        )}

        {step === 3 && (
          <View className="pt-l">
            <Typo variant="headline-xl">CORRECTIV gehört niemandem. Außer allen.</Typo>
            <Typo variant="text-m" color="grey-600" className="mt-s">
              Unser Journalismus bleibt frei — ermöglicht von Menschen, die ihn unterstützen. Der
              Club ist Nähe, keine Paywall: Recherchen früher lesen, Backstage-Einblicke,
              Bonusfolgen.
            </Typo>
          </View>
        )}
      </ScrollView>

      <View className="px-m pb-m">
        {step < 3 ? (
          <Button
            title={step === 0 ? 'Los geht’s' : 'Weiter'}
            variant={mission ? 'club' : 'primary'}
            fullWidth
            onPress={() => setStep(step + 1)}
          />
        ) : (
          <>
            <Button title="Unterstützer:in werden" fullWidth onPress={() => finish(true)} />
            <Button
              title="Erstmal umsehen"
              variant="secondary"
              fullWidth
              className="mt-2xs"
              onPress={() => finish(false)}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { SettingRow } from '@/components/profile/SettingRow';
import { Button, Card, Hairline, Overline, ScreenHeader, Typo } from '@/components/ui';
import { openExternal } from '@/lib/openExternal';
import { coreActions, useSettings } from '@/lib/store/core';

/** Affects the article typography in the reader. */
const TEXT_SCALES = [
  { label: 'A', value: 0.9 },
  { label: 'A+', value: 1 },
  { label: 'A++', value: 1.15 },
];

const LINKS = [
  { title: 'correctiv.org öffnen', url: 'https://correctiv.org/ueber-uns/' },
  { title: 'Impressum', url: 'https://correctiv.org/impressum/' },
  { title: 'Datenschutz', url: 'https://correctiv.org/datenschutz/' },
];

export default function EinstellungenScreen() {
  const settings = useSettings();
  const [resetDone, setResetDone] = useState(false);

  const followSystem = settings.theme === 'system';

  return (
    <View className="flex-1 bg-grey-100">
      <ScreenHeader />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-m pt-m pb-2xl"
        showsVerticalScrollIndicator={false}
      >
        <Typo variant="headline-l">Einstellungen</Typo>

        <View className="mt-m">
          <Overline label="Benachrichtigungen" />
          <Card className="mt-2xs">
            <SettingRow
              label="Push-Mitteilungen"
              description="Neue Recherchen und Mitmach-Aufrufe (simuliert)"
              value={settings.pushOptIn}
              onValueChange={(value) => coreActions.settings.setPushOptIn(value)}
            />
          </Card>
        </View>

        <View className="mt-m">
          <Overline label="Darstellung" />
          <Card className="mt-2xs">
            <SettingRow
              label="An Systemeinstellung orientieren"
              value={followSystem}
              onValueChange={(value) => coreActions.settings.setTheme(value ? 'system' : 'light')}
            />
            {!followSystem && (
              <>
                <Hairline className="my-2xs" />
                <SettingRow
                  label="Dunkelmodus"
                  value={settings.theme === 'dark'}
                  onValueChange={(value) => coreActions.settings.setTheme(value ? 'dark' : 'light')}
                />
              </>
            )}
          </Card>
        </View>

        <View className="mt-m">
          <Overline label="Textgröße im Artikel" />
          <Card className="mt-2xs">
            <View className="flex-row gap-s">
              {TEXT_SCALES.map((scale) => {
                const active = settings.textScale === scale.value;
                return (
                  <Pressable
                    key={scale.label}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`Textgröße ${scale.label}`}
                    onPress={() => coreActions.settings.setTextScale(scale.value)}
                    className={[
                      'flex-1 items-center rounded-md border py-s active:opacity-80',
                      active ? 'border-emphasis bg-grey-200' : 'border-grey-300',
                    ].join(' ')}
                  >
                    <Typo variant="text-m" weight={active ? 'bold' : 'normal'}>
                      {scale.label}
                    </Typo>
                  </Pressable>
                );
              })}
            </View>
            <Typo variant="text-s" color="grey-500" className="mt-s">
              Wirkt sich auf die Artikel-Ansicht aus.
            </Typo>
          </Card>
        </View>

        <View className="mt-m">
          <Overline label="Über CORRECTIV" />
          <Card className="mt-2xs">
            <Typo variant="text-m">
              CORRECTIV ist ein gemeinnütziges, unabhängiges Recherchezentrum. Recherchen für die
              Gesellschaft — finanziert von Menschen wie Ihnen.
            </Typo>
            {LINKS.map((link) => (
              <Button
                key={link.url}
                title={link.title}
                variant="outline"
                onPress={() => openExternal(link.url)}
                className="mt-s"
                fullWidth
              />
            ))}
          </Card>
        </View>

        <View className="mt-m">
          <Overline label="Demo" />
          <Card tone="surface" className="mt-2xs">
            <Typo variant="text-s" color="grey-600">
              Für Vorführungen: setzt Mitgliedschaft, Interessen und Onboarding zurück.
            </Typo>
            <Button
              title="Demo-Zustand zurücksetzen"
              variant="secondary"
              className="mt-s"
              fullWidth
              onPress={() => {
                // Three stores, because each owns its own keys — see resetForDemo.
                coreActions.settings.resetForDemo();
                coreActions.membership.reset();
                coreActions.interests.clear();
                setResetDone(true);
              }}
            />
            {resetDone && (
              <Typo variant="text-s" color="emphasis" className="mt-s">
                ✓ Zurückgesetzt — App neu starten für das Onboarding.
              </Typo>
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Hairline, Typo } from '@/components/ui';
import type { MembershipInterval } from '@correctiv/app-core/stores/membership';
import { coreActions } from '@/lib/store/core';
import { colors, sizes, typography } from '@/lib/theme';

/** Echte Zahlen aus dem Konzept — der erste Schritt argumentiert, er drängt nicht. */
const FACTS = [
  { value: '247', label: 'Recherchen im letzten Jahr — alle frei zugänglich' },
  { value: '31.000+', label: 'Menschen tragen CORRECTIV bereits' },
  { value: '0', label: 'Artikel hinter einer Paywall — heute und in Zukunft' },
];

/**
 * Beitragsstufen als Presets statt Slider: React Native hat keinen Slider mehr,
 * und für Geld ist Antippen ohnehin genauer als Ziehen. Der Designentwurf zeigt
 * einen Slider — das ist die bewusste Abweichung, dieselbe wie beim Player.
 */
const AMOUNTS = [5, 10, 15, 20, 30, 50];

/** Schwellen als Einladung, nicht als Stufenmodell: Zeilen leuchten auf. */
const PERKS = [
  { min: 15, text: 'Ab 15 €: das CORRECTIV-Bookzine viermal im Jahr per Post' },
  { min: 30, text: 'Ab 30 €: signierte Neuerscheinung des CORRECTIV Verlags' },
];

/**
 * Der Beitritts-Fluss: warum → Beitrag → Daten → willkommen.
 *
 * Schritt 4 ist der Statuswechsel, um den die Demo gebaut ist: `join()` setzt
 * `isMember`, und jeder Club-Berührungspunkt in der App reagiert im selben Tick.
 * Zahlung und Konto sind simuliert, und der Bildschirm sagt das auch.
 *
 * Kein Dark Pattern: bis zum Abschluss steht neben jedem „Weiter" ein gleichwertiges
 * „Erstmal umsehen".
 */
export default function BeitretenScreen() {
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState(10);
  const [interval, setInterval] = useState<MembershipInterval>('monatlich');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const dataValid = name.trim().length > 1 && email.includes('@');
  const per = interval === 'monatlich' ? 'im Monat' : 'im Jahr';

  const join = () => {
    coreActions.membership().join(amount, interval, name.trim());
    setStep(3);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-grey-100">
      <View className="flex-row justify-end px-s py-2xs">
        {step < 3 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Schließen"
            onPress={() => router.back()}
            hitSlop={8}
            className="items-center justify-center active:opacity-70"
            style={{ width: sizes.iconButton, height: sizes.iconButton }}
          >
            <Ionicons name="close" size={24} color={colors['grey-700']} />
          </Pressable>
        )}
      </View>

      <View className="flex-row gap-3xs px-m">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className={['flex-1 rounded-s', i <= step ? 'bg-emphasis' : 'bg-grey-300'].join(' ')}
            style={{ height: sizes.progressBar }}
          />
        ))}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-m pt-m pb-l"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <>
            <Typo variant="headline-xl">CORRECTIV gehört niemandem. Außer allen.</Typo>
            <Typo variant="text-l" className="mt-s">
              Unser Journalismus bleibt frei. Für alle. Ihr Beitrag macht genau das möglich.
            </Typo>
            {FACTS.map((fact) => (
              <View key={fact.value} className="mt-m flex-row items-baseline">
                <Typo variant="headline-l" color="emphasis" style={{ minWidth: 96 }}>
                  {fact.value}
                </Typo>
                <Typo variant="text-s" color="grey-600" className="flex-1">
                  {fact.label}
                </Typo>
              </View>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Typo variant="headline-xl">Ihr Beitrag</Typo>
            <View className="mt-m flex-row items-baseline justify-center">
              <Typo variant="headline-xxl">{amount} €</Typo>
              <Typo variant="text-m" color="grey-600" className="ml-2xs">
                {per}
              </Typo>
            </View>

            <View className="mt-m flex-row flex-wrap gap-2xs">
              {AMOUNTS.map((value) => {
                const active = value === amount;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`${value} €`}
                    onPress={() => setAmount(value)}
                    className={[
                      'flex-1 items-center rounded-md border py-s active:opacity-80',
                      active ? 'border-emphasis bg-grey-200' : 'border-grey-300',
                    ].join(' ')}
                  >
                    <Typo variant="text-m" weight={active ? 'bold' : 'normal'}>
                      {value} €
                    </Typo>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-m flex-row gap-2xs">
              {(['monatlich', 'jährlich'] as MembershipInterval[]).map((option) => {
                const active = option === interval;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={option === 'monatlich' ? 'Monatlich' : 'Jährlich'}
                    onPress={() => setInterval(option)}
                    className={[
                      'flex-1 items-center rounded-md border py-s active:opacity-80',
                      active ? 'border-emphasis bg-grey-200' : 'border-grey-300',
                    ].join(' ')}
                  >
                    <Typo variant="text-m" weight={active ? 'bold' : 'normal'}>
                      {option === 'monatlich' ? 'Monatlich' : 'Jährlich'}
                    </Typo>
                  </Pressable>
                );
              })}
            </View>

            <Card tone="surface" className="mt-m">
              {PERKS.map((perk, i) => (
                <Typo
                  key={perk.min}
                  variant="text-s"
                  color={amount >= perk.min ? 'grey-700' : 'grey-500'}
                  className={i > 0 ? 'mt-2xs' : ''}
                >
                  {amount >= perk.min ? '✓ ' : ''}
                  {perk.text}
                </Typo>
              ))}
            </Card>
          </>
        )}

        {step === 2 && (
          <>
            <Typo variant="headline-xl">Ihre Daten</Typo>
            <Typo variant="text-s" color="grey-500" className="mt-2xs">
              Für den Prototyp wird nichts übertragen — Zahlung und Konto sind simuliert.
            </Typo>

            <Typo variant="headline-xs" className="mt-m">
              Name
            </Typo>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Vor- und Nachname"
              placeholderTextColor={colors['grey-500']}
              accessibilityLabel="Name"
              autoComplete="name"
              className="mt-2xs rounded-md border border-grey-300 px-s py-s"
              style={[typography['text-m'], { color: colors['grey-700'] }]}
            />

            <Typo variant="headline-xs" className="mt-s">
              E-Mail
            </Typo>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@beispiel.de"
              placeholderTextColor={colors['grey-500']}
              accessibilityLabel="E-Mail"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              className="mt-2xs rounded-md border border-grey-300 px-s py-s"
              style={[typography['text-m'], { color: colors['grey-700'] }]}
            />

            <Card tone="surface" className="mt-m">
              <Typo variant="text-s" color="grey-600">
                Zahlungsart: SEPA-Lastschrift (simuliert)
              </Typo>
            </Card>
          </>
        )}

        {step === 3 && (
          <View className="items-center pt-l">
            <View
              className="items-center justify-center rounded-full bg-alternative"
              style={{ width: 96, height: 96 }}
            >
              <Ionicons name="checkmark" size={48} color={colors['grey-700']} />
            </View>
            <Typo variant="headline-xl" className="mt-m text-center">
              Willkommen im Club.
            </Typo>
            <Typo variant="text-m" color="grey-600" className="mt-s text-center">
              Sie unterstützen CORRECTIV ab jetzt mit {amount} € {per}. Ab sofort lesen Sie
              Recherchen früher, hören Bonusfolgen und sehen hinter die Kulissen.
            </Typo>
          </View>
        )}
      </ScrollView>

      <View>
        <Hairline />
        <View className="px-m py-s">
          {step === 0 && <Button title="Weiter" fullWidth onPress={() => setStep(1)} />}
          {step === 1 && (
            <Button title={`Mit ${amount} € unterstützen`} fullWidth onPress={() => setStep(2)} />
          )}
          {step === 2 && (
            <Button title="Jetzt Mitglied werden" fullWidth disabled={!dataValid} onPress={join} />
          )}
          {step === 3 && (
            <Button
              title="Ins Backstage"
              fullWidth
              onPress={() => {
                router.back();
                router.push('/backstage');
              }}
            />
          )}
          {step < 3 && (
            <Button
              title="Erstmal umsehen"
              variant="outline"
              fullWidth
              className="mt-2xs"
              onPress={() => router.back()}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

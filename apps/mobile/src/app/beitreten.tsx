import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button, Card, Hairline, SafeAreaView, Typo } from '@/components/ui';
import type { MembershipInterval } from '@correctiv/app-core/stores/membership';
import { goBack } from '@/lib/navigation/goBack';
import { useCoreActions } from '@/lib/store/core';
import { sizes, useColors } from '@/lib/theme';

/**
 * Contribution levels as presets rather than a slider: React Native no longer ships
 * one, and for money a tap is more precise than a drag anyway. The design draft
 * shows a slider — this is the deliberate divergence, the same one as in the player.
 */
const AMOUNTS = [5, 10, 15, 20, 30, 50];

/** Thresholds as an invitation, not a tier model: the rows light up. */
const PERKS = [
  { min: 15, text: 'Ab 15 €: das CORRECTIV-Bookzine viermal im Jahr per Post' },
  { min: 30, text: 'Ab 30 €: signierte Neuerscheinung des CORRECTIV Verlags' },
];

/**
 * Setting the contribution: amount → confirmation.
 *
 * It used to open with a case for joining and then ask for a name and an email.
 * Behind the door (ADR 0016) it is reached from the profile's „Beitrag ändern“ by
 * somebody who has already paid to be here, so the case has no audience and the
 * app already knows who they are: `session.account` holds both fields the form
 * asked for, and it threw the email away. Both steps are gone with ADR 0019.
 *
 * Whether a contribution is set inside the app at all is a product and app-store
 * question that ADR 0016 named and nobody has answered. Until then this flow is
 * what it always was: simulated, and it says so on the screen.
 */
export default function BeitretenScreen() {
  const colors = useColors();
  const actions = useCoreActions();
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState(10);
  const [interval, setInterval] = useState<MembershipInterval>('monatlich');
  const per = interval === 'monatlich' ? 'im Monat' : 'im Jahr';

  const save = () => {
    actions.membership.join(amount, interval);
    setStep(1);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-grey-100">
      <View className="flex-row justify-end px-s py-2xs">
        {step < 1 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Schließen"
            onPress={goBack}
            hitSlop={8}
            className="items-center justify-center active:opacity-70"
            style={{ width: sizes.iconButton, height: sizes.iconButton }}
          >
            <Ionicons name="close" size={24} color={colors['grey-700']} />
          </Pressable>
        )}
      </View>

      <View className="flex-row gap-3xs px-m">
        {[0, 1].map((i) => (
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
            <Typo variant="headline-xl">Ihr Beitrag</Typo>
            <Typo variant="text-s" color="grey-500" className="mt-2xs">
              Es wird nichts übertragen. Die Zahlung ist simuliert.
            </Typo>
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

        {step === 1 && (
          <View className="items-center pt-l">
            <View
              className="items-center justify-center rounded-full bg-alternative"
              style={{ width: 96, height: 96 }}
            >
              <Ionicons name="checkmark" size={48} color={colors['grey-700']} />
            </View>
            <Typo variant="headline-xl" className="mt-m text-center">
              Ihr Beitrag ist gesetzt.
            </Typo>
            <Typo variant="text-m" color="grey-600" className="mt-s text-center">
              Sie unterstützen CORRECTIV mit {amount} € {per}. Vielen Dank.
            </Typo>
          </View>
        )}
      </ScrollView>

      <View>
        <Hairline />
        <View className="px-m py-s">
          {step === 0 && (
            <Button title={`Beitrag auf ${amount} € setzen`} fullWidth onPress={save} />
          )}
          {step === 1 && (
            <Button
              title="Ins Backstage"
              fullWidth
              onPress={() => {
                goBack();
                router.push('/backstage');
              }}
            />
          )}
          {step < 1 && (
            <Button
              title="Abbrechen"
              variant="outline"
              fullWidth
              className="mt-2xs"
              onPress={goBack}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

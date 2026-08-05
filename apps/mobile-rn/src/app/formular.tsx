import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { FormField } from '@/components/participate/FormField';
import { Button, Hairline, ScreenHeader, Typo } from '@/components/ui';
import { callouts, type CalloutComponent, type Callout } from '@correctiv/app-core/data/callouts';
import { formatNumberDe } from '@correctiv/app-core/lib/format';
import { coreActions, useExtraCount } from '@/lib/store/core';
import { colors } from '@/lib/theme';

/**
 * Der Mitmach-Fluss: mehrstufiges Formular nach dem Schema des Aufrufs, danach die
 * Dankeseite.
 *
 * Kein Pfad-Parameter (`/aufruf/[slug]/formular`), sondern `?slug=` — die Route
 * exportiert damit als eine Datei und braucht keine verschachtelten
 * `generateStaticParams`. Dieselbe Entscheidung wie bei /artikel und /video.
 *
 * Die Dankeseite ist ein Zustand DIESER Route, keine eigene: sie zeigt denselben,
 * gerade erhöhten Zähler, und der Nutzer soll nicht per Zurück ins ausgefüllte
 * Formular zurückfallen können.
 */
export default function FormularScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const callout = useMemo(() => callouts.find((c) => c.slug === slug) ?? null, [slug]);

  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<Record<string, string[]>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!callout) {
    return (
      <View className="flex-1 bg-grey-100">
        <ScreenHeader onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-m">
          <Typo variant="headline-s" className="text-center">
            Dieses Formular gibt es nicht
          </Typo>
          <Typo variant="text-m" color="grey-600" className="mt-2xs text-center">
            {slug ? `Unbekannter Aufruf „${slug}“.` : 'Es wurde kein Aufruf übergeben.'}
          </Typo>
        </View>
      </View>
    );
  }

  if (submitted) return <ThankYou callout={callout} />;

  const slides = callout.formSchema.slides;
  const slide = slides[Math.min(step, slides.length - 1)];
  const isLast = step === slides.length - 1;

  const select = (component: CalloutComponent, value: string) => {
    setChoices((prev) => {
      const current = prev[component.key] ?? [];
      if (component.type === 'radio') return { ...prev, [component.key]: [value] };
      return {
        ...prev,
        [component.key]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const stepValid = slide.components.every((component) => {
    if (!component.required) return true;
    if (component.type === 'radio' || component.type === 'selectboxes') {
      return (choices[component.key] ?? []).length > 0;
    }
    if (component.type === 'textarea' || component.type === 'textfield') {
      return (texts[component.key] ?? '').trim().length > 0;
    }
    return true;
  });

  const next = () => {
    if (!stepValid) return;
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    coreActions.participation().submit(callout.slug, { ...choices, ...texts });
    setSubmitted(true);
  };

  return (
    <View className="flex-1 bg-grey-100">
      <ScreenHeader onBack={() => router.back()} backLabel="Abbrechen" />

      {/* Schrittanzeige: ein Balken je Folie, gefüllt bis zur aktuellen. */}
      <View className="flex-row gap-3xs px-m pt-2xs">
        {slides.map((s, i) => (
          <View
            key={s.id}
            className={['h-1 flex-1 rounded-s', i <= step ? 'bg-emphasis' : 'bg-grey-300'].join(
              ' ',
            )}
          />
        ))}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-m pt-s pb-l"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Typo variant="text-s" color="grey-500">
          Schritt {step + 1} von {slides.length}
        </Typo>
        <Typo variant="headline-l" className="mt-2xs">
          {slide.title}
        </Typo>

        {slide.components.map((component) => (
          <FormField
            key={component.key}
            component={component}
            choice={choices[component.key] ?? []}
            text={texts[component.key] ?? ''}
            fileAttached={files[component.key] ?? false}
            onSelect={(value) => select(component, value)}
            onText={(value) => setTexts((prev) => ({ ...prev, [component.key]: value }))}
            onToggleFile={() =>
              setFiles((prev) => ({ ...prev, [component.key]: !prev[component.key] }))
            }
          />
        ))}
      </ScrollView>

      <View className="bg-grey-100">
        <Hairline />
        <View className="flex-row gap-s px-m py-s">
          {step > 0 && (
            <Button
              title="Zurück"
              variant="secondary"
              onPress={() => setStep(step - 1)}
              className="flex-1"
            />
          )}
          <Button
            title={isLast ? 'Absenden' : 'Weiter'}
            onPress={next}
            disabled={!stepValid}
            className="flex-1"
          />
        </View>
      </View>
    </View>
  );
}

/** Dankeseite mit dem Zähler, der die eigene Einreichung schon enthält. */
function ThankYou({ callout }: { callout: Callout }) {
  const extra = useExtraCount(callout.slug);

  return (
    <View className="flex-1 bg-grey-100">
      <View className="flex-1 items-center justify-center px-m">
        <Ionicons name="checkmark-circle" size={64} color={colors.emphasis} />
        <Typo variant="headline-xl" className="mt-m text-center">
          Danke für Ihren Beitrag!
        </Typo>
        <Typo variant="text-m" color="grey-600" className="mt-s text-center">
          Ihr Beitrag fließt in die Recherche ein. Die Redaktion prüft alle Hinweise — bei
          Rückfragen melden wir uns.
        </Typo>
        <Typo variant="headline-xs" className="mt-m text-center">
          {formatNumberDe(callout.responseCount + extra)} Menschen haben bereits beigetragen.
        </Typo>
      </View>
      <View className="px-m pb-l">
        <Button title="Weitere Mitmach-Aktionen ansehen" fullWidth onPress={backToOverview} />
      </View>
    </View>
  );
}

/**
 * Aufrufseite UND Formular in einem Schritt schließen — sonst landet man auf der
 * Detailseite und muss noch einmal zurück. `replace` ist der Rückfall für den Fall,
 * dass niemand hierher navigiert ist (kalter Deep-Link direkt aufs Formular).
 */
function backToOverview(): void {
  if (router.canGoBack()) {
    router.dismissTo('/(tabs)/mitmachen');
    return;
  }
  router.replace('/(tabs)/mitmachen');
}

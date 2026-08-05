import { Screen, Typo } from '@/components/ui';

export default function MitmachenScreen() {
  return (
    <Screen>
      <Typo variant="headline-xl" className="mb-2xs">
        Mitmachen
      </Typo>
      <Typo variant="text-m" color="grey-600">
        Recherchen entstehen mit Ihnen — das Herzstück. (M4)
      </Typo>
    </Screen>
  );
}

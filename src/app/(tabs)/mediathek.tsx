import { Screen, Typo } from '@/components/ui';

export default function MediathekScreen() {
  return (
    <Screen>
      <Typo variant="headline-xl" className="mb-2xs">
        Mediathek
      </Typo>
      <Typo variant="text-m" color="grey-600">
        Alles Hörbare und Sehbare an einem Ort. (M3)
      </Typo>
    </Screen>
  );
}

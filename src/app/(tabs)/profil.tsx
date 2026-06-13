import { Screen, Typo } from '@/components/ui';

export default function ProfilScreen() {
  return (
    <Screen>
      <Typo variant="headline-xl" className="mb-2xs">
        Profil
      </Typo>
      <Typo variant="text-m" color="grey-600">
        Konto, Mitgliedschaft, Eigenes. (M5)
      </Typo>
    </Screen>
  );
}

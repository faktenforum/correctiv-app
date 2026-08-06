import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { ClaimStatusTag } from '@/components/participate/ClaimStatusTag';
import { Card, ScreenHeader, Typo } from '@/components/ui';
import { claims, type Claim } from '@correctiv/app-core/data/claims';
import { formatDateShortDe } from '@correctiv/app-core/lib/format';

/**
 * Faktenforum — was die Community gerade prüft. Die Daten liegen im Core in der
 * GraphQL-Antwortform des echten Faktenforum-Backends, damit später nur der
 * Datenlayer getauscht werden muss.
 */
export default function FaktenforumScreen() {
  return (
    <View className="flex-1 bg-grey-100">
      <ScreenHeader />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-m pt-m pb-2xl"
        showsVerticalScrollIndicator={false}
      >
        <Typo variant="headline-l">Faktenforum</Typo>
        <Typo variant="text-m" color="grey-600" className="mt-2xs">
          Die Community prüft Behauptungen — gemeinsam mit der CORRECTIV-Redaktion. Schauen Sie, was
          gerade in Arbeit ist.
        </Typo>

        <View className="mt-m">
          {claims.map((claim) => (
            <ClaimRow key={claim.id} claim={claim as Claim} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ClaimRow({ claim }: { claim: Claim }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={claim.shortId}
      onPress={() => router.push({ pathname: '/behauptung/[id]', params: { id: claim.id } })}
      className="mb-s active:opacity-80"
    >
      <Card>
        <ClaimStatusTag claim={claim} />
        <Typo variant="headline-xs" className="mt-2xs">
          „{claim.quote}“
        </Typo>
        <Typo variant="text-s" color="grey-500" className="mt-2xs">
          {claim.shortId} · eingereicht {formatDateShortDe(claim.submittedAt)}
        </Typo>
      </Card>
    </Pressable>
  );
}

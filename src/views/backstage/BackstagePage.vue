mkdir -p src/views/backstage
cat > src/views/backstage/BackstagePage.vue <<'EOF'
<template>
  <!-- M3-Stub: Teaser-Sicht; vollständiger Hub mit allen Sektionen folgt in M7 -->
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" text="Backstage" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" />
      </GridLayout>
      <ScrollView row="1">
        <StackLayout class="px-sm py-m">
          <Label
            :text="membership.isMember
              ? 'Schön, dass Sie da sind. Hier entsteht der vollständige Backstage-Bereich (M7).'
              : 'Backstage ist der Bereich für Clubmitglieder: Recherchen früher lesen, Tagebücher, Bonusfolgen. Der vollständige Hub folgt in M7.'"
            class="ty-text-m text-grey-600"
            textWrap="true"
          />
          <Button
            v-if="!membership.isMember"
            text="Unterstützer:in werden"
            class="btn-primary mt-m"
            @tap="openJoinFlow()"
          />
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { icons } from '../../ui/icons';
import { useNavigation } from '../../composables/useNavigation';
import { useMembershipStore } from '../../stores/membership';
import { useJoinFlow } from '../../composables/useJoinFlow';

const { goBack } = useNavigation();
const membership = useMembershipStore();
const { openJoinFlow } = useJoinFlow();
</script>

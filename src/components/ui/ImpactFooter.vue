<template>
  <StackLayout class="impact-footer">
    <Label
      :text="membership.isMember
        ? 'Ermöglicht durch Unterstützer:innen wie Sie — danke, dass Sie dabei sind.'
        : 'Ermöglicht durch Unterstützer:innen wie Sie.'"
      class="impact-footer__line"
      textWrap="true"
    />
    <Button
      v-if="!membership.isMember"
      text="Unterstützer:in werden"
      class="btn-quiet impact-footer__cta"
      @tap="openJoinFlow()"
    />
  </StackLayout>
</template>

<script setup lang="ts">
import { useMembershipStore } from '../../stores/membership';
import { useJoinFlow } from '../../composables/useJoinFlow';

const membership = useMembershipStore();
const { openJoinFlow } = useJoinFlow();
</script>

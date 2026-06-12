<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <StackLayout row="0" class="px-sm py-s hairline-bottom">
        <Label text="CORRECTIV" class="brand" />
      </StackLayout>
      <StackLayout row="1" verticalAlignment="center" class="px-m">
        <Label text="Home" class="ty-headline-xl text-grey-700" textWrap="true" />
        <Label text="Tagesaktuelle Recherchen folgen in M3." class="ty-text-m text-grey-600 mt-s" textWrap="true" />
        <Button text="Detail öffnen (Smoke-Test)" class="btn-secondary mt-m" @tap="openSmoke" />
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import DevDetailPage from '../dev/DevDetailPage.vue';
import { useNavigation } from '../../composables/useNavigation';

const { navigate } = useNavigation();
function openSmoke() {
  navigate(DevDetailPage, { props: { source: 'Home' } });
}
</script>

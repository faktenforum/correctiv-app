<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <StackLayout row="0" class="px-sm py-s hairline-bottom">
        <Label text="CORRECTIV" class="brand" />
      </StackLayout>
      <ScrollView row="1">
        <StackLayout class="px-sm py-m">
          <Label text="Mediathek" class="ty-headline-xl text-grey-700 mb-s" textWrap="true" />
          <LiveBanner class="mt-s" />
          <Label
            text="Podcasts, Videos und Bonusinhalte folgen in M5."
            class="ty-text-m text-grey-600 mt-m"
            textWrap="true"
          />
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import LiveBanner from '../../components/ui/LiveBanner.vue';
</script>

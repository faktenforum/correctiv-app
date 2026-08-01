<template>
  <GridLayout columns="*, auto" class="section-header">
    <Label col="0" :text="title" class="section-header__title" />
    <Label v-if="action" col="1" :text="action" class="section-header__action" @tap="$emit('action')" />
  </GridLayout>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; action?: string }>(), { action: '' });
defineEmits<{ (e: 'action'): void }>();
</script>

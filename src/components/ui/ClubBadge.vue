<template>
  <Label :text="text" class="badge badge-club" />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ text?: string }>(), { text: 'CLUB' });
</script>

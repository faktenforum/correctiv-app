<template>
  <Label :text="text.toUpperCase()" class="badge badge-project" />
</template>

<script setup lang="ts">
defineProps<{ text: string }>();
</script>

<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, auto, *, auto" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.x" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" :text="callout.title" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" :maxLines="1" />
      </GridLayout>

      <!-- Step indicator -->
      <GridLayout row="1" :columns="stepColumns" class="step-indicator">
        <Label
          v-for="(slide, i) in slides"
          :key="slide.id"
          :col="i"
          class="step-indicator__bar"
          :class="{ 'step-indicator__bar--active': i <= step }"
        />
      </GridLayout>

      <ScrollView row="2">
        <StackLayout class="px-sm py-m">
          <Label :text="`Schritt ${step + 1} von ${slides.length}`" class="ty-text-s text-grey-500" />
          <Label :text="currentSlide.title" class="ty-headline-l text-grey-700 mt-xs" textWrap="true" />

          <StackLayout v-for="component in currentSlide.components" :key="component.key" class="mt-m">
            <Label :text="component.label" class="ty-headline-xs text-grey-700" textWrap="true" />
            <Label
              v-if="component.description"
              :text="component.description"
              class="ty-text-s text-grey-600 mt-xs"
              textWrap="true"
            />

            <!-- radio / selectboxes -->
            <StackLayout v-if="component.type === 'radio' || component.type === 'selectboxes'" class="mt-s">
              <GridLayout
                v-for="value in component.values"
                :key="value.value"
                columns="auto, *"
                class="form-option"
                :class="{ 'form-option--selected': isSelected(component, value.value) }"
                @tap="select(component, value.value)"
              >
                <Label
                  col="0"
                  :text="isSelected(component, value.value) ? icons.check : ''"
                  class="lucide form-option__check"
                />
                <Label col="1" :text="value.label" class="form-option__label" textWrap="true" />
              </GridLayout>
            </StackLayout>

            <!-- textarea / textfield -->
            <TextView
              v-else-if="component.type === 'textarea'"
              v-model="textAnswers[component.key]"
              :hint="component.placeholder ?? 'Ihre Antwort …'"
              class="form-textarea mt-s"
            />
            <TextField
              v-else-if="component.type === 'textfield'"
              v-model="textAnswers[component.key]"
              :hint="component.placeholder ?? ''"
              class="form-textfield mt-s"
            />

            <!-- file (mock) -->
            <GridLayout v-else-if="component.type === 'file'" columns="auto, *" class="form-file mt-s" @tap="toggleFile(component.key)">
              <Label col="0" :text="icons.camera" class="lucide form-file__icon" />
              <Label
                col="1"
                :text="fileAttached[component.key] ? 'foto_2026-06-12.jpg angehängt ✓' : 'Foto oder Dokument auswählen (simuliert)'"
                class="form-file__label"
                textWrap="true"
              />
            </GridLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="3" :columns="step > 0 ? 'auto, *' : '*'" class="px-sm py-s hairline-top">
        <Button v-if="step > 0" col="0" text="Zurück" class="btn-secondary mr-s" @tap="step -= 1" />
        <Button
          :col="step > 0 ? 1 : 0"
          :text="step === slides.length - 1 ? 'Absenden' : 'Weiter'"
          class="btn-primary"
          :isEnabled="stepValid"
          @tap="next"
        />
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'nativescript-vue';
import { icons } from '../../ui/icons';
import type { Callout, CalloutComponent } from '../../data/callouts';
import CalloutSuccessPage from './CalloutSuccessPage.vue';
import { useNavigation } from '../../composables/useNavigation';
import { useParticipationStore } from '../../stores/participation';

const props = defineProps<{ callout: Callout }>();
const { navigate, goBack } = useNavigation();
const participation = useParticipationStore();

const slides = props.callout.formSchema.slides;
const step = ref(0);
const currentSlide = computed(() => slides[step.value]);
const stepColumns = slides.map(() => '*').join(', ');

const choiceAnswers = reactive<Record<string, string[]>>({});
const textAnswers = reactive<Record<string, string>>({});
const fileAttached = reactive<Record<string, boolean>>({});

function isSelected(component: CalloutComponent, value: string): boolean {
  return (choiceAnswers[component.key] ?? []).includes(value);
}

function select(component: CalloutComponent, value: string) {
  const current = choiceAnswers[component.key] ?? [];
  if (component.type === 'radio') {
    choiceAnswers[component.key] = [value];
  } else if (current.includes(value)) {
    choiceAnswers[component.key] = current.filter((v) => v !== value);
  } else {
    choiceAnswers[component.key] = [...current, value];
  }
}

function toggleFile(key: string) {
  fileAttached[key] = !fileAttached[key];
}

const stepValid = computed(() =>
  currentSlide.value.components.every((component) => {
    if (!component.required) return true;
    if (component.type === 'radio' || component.type === 'selectboxes') {
      return (choiceAnswers[component.key] ?? []).length > 0;
    }
    if (component.type === 'textarea' || component.type === 'textfield') {
      return (textAnswers[component.key] ?? '').trim().length > 0;
    }
    return true;
  }),
);

function next() {
  if (!stepValid.value) return;
  if (step.value < slides.length - 1) {
    step.value += 1;
    return;
  }
  participation.submit(props.callout.slug, { ...choiceAnswers, ...textAnswers });
  navigate(CalloutSuccessPage, {
    props: { callout: props.callout },
    clearHistory: false,
  });
}
</script>

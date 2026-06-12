<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <StackLayout row="0" class="px-sm py-s hairline-bottom">
        <Label text="CORRECTIV" class="brand" />
      </StackLayout>

      <ScrollView row="1">
        <StackLayout class="pb-l">
          <Label text="Entdecken" class="ty-headline-xl text-grey-700 px-sm pt-m" textWrap="true" />

          <!-- Search entry -->
          <GridLayout columns="auto, *" class="search-entry mx-sm mt-s" @tap="openSearch">
            <Label col="0" :text="icons.search" class="lucide search-entry__icon" />
            <Label col="1" text="Recherchen, Projekte, Podcasts suchen …" class="search-entry__hint" />
          </GridLayout>

          <!-- Topic chips → live topic pages -->
          <ScrollView orientation="horizontal" class="chip-rail">
            <StackLayout orientation="horizontal" class="px-sm">
              <Label
                v-for="topic in topics"
                :key="topic.id"
                :text="topic.label"
                class="chip onboarding__chip"
                @tap="openTopic(topic)"
              />
            </StackLayout>
          </ScrollView>

          <!-- 7 project groups -->
          <template v-for="group in projectGroups" :key="group.id">
            <SectionHeader :title="group.title" />
            <GridLayout
              v-for="project in group.projects"
              :key="project.id"
              columns="auto, *, auto"
              class="hub-card mx-sm mb-s"
              @tap="openProject(project)"
            >
              <Label col="0" :text="groupIcon(group.id)" class="lucide hub-card__icon" />
              <StackLayout col="1">
                <Label :text="project.name" class="hub-card__title" textWrap="true" />
                <Label :text="project.description" class="hub-card__teaser" textWrap="true" :maxLines="2" />
              </StackLayout>
              <Label
                col="2"
                :text="project.url ? icons.externalLink : icons.chevronRight"
                class="lucide hub-card__chevron"
              />
            </GridLayout>
          </template>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { Utils } from '@nativescript/core';
import { icons } from '../../ui/icons';
import SectionHeader from '../../components/ui/SectionHeader.vue';
import { projectGroups, type Project } from '../../data/projects';
import { interests } from '../../data/interests';
import ProjectPage from './ProjectPage.vue';
import SearchPage from './SearchPage.vue';
import { useNavigation } from '../../composables/useNavigation';

const { navigate, navigateInTab } = useNavigation();

const topics = interests.filter((i) => i.feed);

const GROUP_ICONS: Record<string, string> = {
  recherchieren: icons.newspaper,
  'junge-formate': icons.radio,
  mitmachen: icons.megaphone,
  lernen: icons.sparkles,
  werkzeuge: icons.search,
  verlag: icons.fileText,
  exil: icons.mic,
};

function groupIcon(groupId: string): string {
  return GROUP_ICONS[groupId] ?? icons.compass;
}

function openProject(project: Project) {
  if (project.tab) {
    navigateInTab(project.tab);
  } else if (project.url && !project.feed) {
    Utils.openUrl(project.url);
  } else {
    navigate(ProjectPage, { props: { project } });
  }
}

function openTopic(topic: (typeof interests)[number]) {
  const project: Project = {
    id: topic.id,
    name: topic.label,
    description: `Alle Beiträge zum Thema ${topic.label}.`,
    feed: topic.feed,
  };
  navigate(ProjectPage, { props: { project } });
}

function openSearch() {
  navigate(SearchPage);
}
</script>

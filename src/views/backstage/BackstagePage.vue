<template>
  <!-- Backstage hub — one layer over the whole app, never a locked wing.
       Non-members see the same structure with teasered content (title + two
       lines), never an empty or barred room. -->
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *, auto" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" text="Backstage" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" />
        <ClubBadge col="2" verticalAlignment="center" />
      </GridLayout>

      <ScrollView row="1">
        <StackLayout class="pb-l">
          <!-- Greeting -->
          <StackLayout class="px-sm pt-m">
            <Label
              :text="membership.isMember
                ? 'Schön, dass Sie da sind.'
                : 'Backstage ist der Bereich für Clubmitglieder.'"
              class="ty-headline-xl text-grey-700 font-serif-bold"
              textWrap="true"
            />
            <Label
              :text="membership.isMember
                ? `Mitglied seit ${memberSinceLabel} — hier ist, was diese Woche hinter den Kulissen passiert.`
                : 'Alles hier können Sie sehen — ganz lesen, hören und dabei sein können Mitglieder. Werden Sie Teil davon.'"
              class="ty-text-m text-grey-600 mt-xs"
              textWrap="true"
            />
            <Button
              v-if="!membership.isMember"
              text="Unterstützer:in werden"
              class="btn-primary mt-s"
              @tap="openJoinFlow()"
            />
          </StackLayout>

          <!-- Read earlier (early access) -->
          <SectionHeader title="Früher lesen" />
          <StackLayout class="px-sm">
            <EarlyAccessCard :item="earlyAccess" @read="openArticle" />
          </StackLayout>

          <!-- Research diaries -->
          <SectionHeader title="Recherchetagebücher" />
          <StackLayout
            v-for="entry in diaries"
            :key="entry.id"
            class="diary-card mx-sm mb-s"
            @tap="openDiary(entry)"
          >
            <Label :text="entry.series" class="ty-text-s text-emphasis" />
            <Label :text="entry.title" class="diary-card__title" textWrap="true" />
            <Label :text="entry.teaser" class="diary-card__teaser" textWrap="true" :maxLines="2" />
            <Label
              :text="membership.isMember ? 'Lesen →' : 'Für Mitglieder — Vorschau oben'"
              class="diary-card__cta mt-xs"
            />
          </StackLayout>

          <!-- Bonus audio/video -->
          <SectionHeader title="Bonusfolgen" />
          <GridLayout
            v-for="bonus in bonusMedia"
            :key="bonus.id"
            columns="auto, *, auto"
            class="episode-row mx-sm bonus-row"
            @tap="playBonus(bonus)"
          >
            <Label col="0" :text="icons.headphones" class="lucide episode-row__play" />
            <StackLayout col="1" verticalAlignment="center">
              <Label :text="bonus.title" class="episode-row__title" textWrap="true" />
              <Label
                :text="membership.isMember ? bonus.durationLabel : `${bonus.durationLabel} · 60 Sek. anspielen`"
                class="episode-row__meta"
              />
            </StackLayout>
            <ClubBadge col="2" verticalAlignment="center" />
          </GridLayout>

          <!-- Club newsletter -->
          <SectionHeader title="Club-Newsletter" />
          <StackLayout class="card mx-sm">
            <Label :text="clubNewsletter.subject" class="ty-headline-xs text-grey-700" textWrap="true" />
            <Label :text="formatDateDe(clubNewsletter.date)" class="ty-text-s text-grey-500 mt-xs" />
            <Label
              v-for="(paragraph, i) in newsletterParagraphs"
              :key="i"
              :text="paragraph"
              class="ty-text-m text-grey-700 mt-s"
              textWrap="true"
            />
            <Label
              v-if="!membership.isMember"
              text="… den ganzen Brief lesen Mitglieder."
              class="ty-text-s text-grey-500 mt-s"
            />
          </StackLayout>

          <!-- Q&A -->
          <SectionHeader title="Fragen an die Redaktion" />
          <StackLayout class="card mx-sm">
            <Label :text="qa.title" class="ty-headline-xs text-grey-700" textWrap="true" />
            <Label :text="qa.description" class="ty-text-s text-grey-600 mt-xs" textWrap="true" />
            <Label :text="qa.deadlineLabel" class="ty-text-s text-emphasis mt-xs" />
            <template v-if="membership.isMember">
              <TextView v-model="question" hint="Ihre Frage an das Rechercheteam …" class="form-textarea mt-s" />
              <Button
                :text="questionSent ? '✓ Frage eingereicht' : 'Frage einreichen'"
                class="btn-secondary mt-s"
                :isEnabled="!questionSent && question.trim().length > 3"
                @tap="sendQuestion"
              />
            </template>
            <Label v-else text="Fragen stellen können Mitglieder." class="ty-text-s text-grey-500 mt-s" />
          </StackLayout>

          <!-- Events -->
          <SectionHeader title="Events" />
          <GridLayout v-for="event in events" :key="event.id" columns="auto, *" class="card mx-sm">
            <StackLayout col="0" class="event-date mr-s" verticalAlignment="center">
              <Label :text="eventDay(event.date)" class="event-date__day" />
              <Label :text="eventMonth(event.date)" class="event-date__month" />
            </StackLayout>
            <StackLayout col="1">
              <Label :text="event.title" class="ty-headline-xs text-grey-700" textWrap="true" />
              <Label :text="event.location" class="ty-text-s text-grey-600 mt-xs" textWrap="true" />
              <Label :text="event.description" class="ty-text-s text-grey-600 mt-xs" textWrap="true" :maxLines="2" />
            </StackLayout>
          </GridLayout>

          <!-- Verlag perk -->
          <SectionHeader title="Ihr Verlags-Vorteil" />
          <StackLayout class="verlag-card mx-sm" @tap="openShop">
            <Label :text="verlagPerk.title" class="ty-headline-xs text-grey-700" textWrap="true" />
            <Label :text="verlagPerk.description" class="ty-text-s text-grey-600 mt-xs" textWrap="true" />
            <Label
              v-if="membership.isMember"
              :text="`Ihr Rabattcode: ${verlagPerk.code}`"
              class="verlag-card__code mt-s"
            />
            <Label text="Zum Shop →" class="ty-text-s text-grey-700 font-sans-semibold mt-s" />
          </StackLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { ref, computed } from 'nativescript-vue';
import { Utils } from '@nativescript/core';
import { icons } from '../../ui/icons';
import SectionHeader from '../../components/ui/SectionHeader.vue';
import ClubBadge from '../../components/ui/ClubBadge.vue';
import EarlyAccessCard from '../../components/cards/EarlyAccessCard.vue';
import DiaryPage from './DiaryPage.vue';
import ArticleReaderPage from '../reader/ArticleReaderPage.vue';
import { earlyAccess, diaries, bonusMedia, clubNewsletter, qa, events, verlagPerk, type DiaryEntry, type BonusMedia } from '../../data/backstage';
import { useMembershipStore } from '../../stores/membership';
import { useAudioStore } from '../../stores/audio';
import { useNavigation } from '../../composables/useNavigation';
import { useJoinFlow } from '../../composables/useJoinFlow';
import { formatDateDe, formatDateShortDe } from '../../lib/format';

const membership = useMembershipStore();
const audioStore = useAudioStore();
const { navigate, goBack } = useNavigation();
const { openJoinFlow } = useJoinFlow();

const question = ref('');
const questionSent = ref(false);

const memberSinceLabel = computed(() =>
  membership.memberSince ? formatDateShortDe(membership.memberSince) : '',
);
/** Non-members see the first paragraph only — teaser, never an empty room */
const newsletterParagraphs = computed(() =>
  membership.isMember ? clubNewsletter.paragraphs : clubNewsletter.paragraphs.slice(0, 1),
);

function openArticle(url: string) {
  navigate(ArticleReaderPage, { props: { url } });
}

function openDiary(entry: DiaryEntry) {
  if (membership.isMember) {
    navigate(DiaryPage, { props: { entry } });
  } else {
    openJoinFlow();
  }
}

function playBonus(bonus: BonusMedia) {
  const track = {
    title: bonus.title,
    subtitle: 'Backstage · Club',
    url: bonus.source,
    episodeId: bonus.id,
  };
  if (membership.isMember) {
    audioStore.playEpisode(track);
  } else {
    audioStore.playPreview(track);
  }
}

function sendQuestion() {
  questionSent.value = true;
}

function eventDay(iso: string): string {
  return String(new Date(iso).getDate());
}
function eventMonth(iso: string): string {
  return ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][
    new Date(iso).getMonth()
  ];
}

function openShop() {
  Utils.openUrl(verlagPerk.shopUrl);
}
</script>

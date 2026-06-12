import { defineStore } from 'pinia';

export interface SavedArticle {
  url: string;
  title: string;
  topline: string | null;
  rating: string | null;
  savedAt: string;
}

export const useSavedArticlesStore = defineStore('savedArticles', {
  state: () => ({
    items: [] as SavedArticle[],
  }),
  getters: {
    isSaved: (state) => (url: string) => state.items.some((a) => a.url === url),
  },
  actions: {
    toggle(article: SavedArticle) {
      const index = this.items.findIndex((a) => a.url === article.url);
      if (index >= 0) {
        this.items.splice(index, 1);
      } else {
        this.items.unshift(article);
      }
    },
    remove(url: string) {
      this.items = this.items.filter((a) => a.url !== url);
    },
  },
});

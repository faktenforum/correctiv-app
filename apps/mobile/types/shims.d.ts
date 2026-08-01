declare module '*?inline' {
  const css: string;
  export default css;
}

declare module '*.vue' {
  import type { DefineComponent } from 'nativescript-vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

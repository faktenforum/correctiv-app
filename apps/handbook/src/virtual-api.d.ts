declare module 'virtual:api' {
  export interface ApiSymbol {
    name: string;
    kind: 'function' | 'const' | 'type' | 'interface' | 'class' | 'enum';
    signature: string;
    summary: string;
    doc: string;
    line: number;
  }
  export interface ApiModule {
    subpath: string;
    file: string;
    /** The file header, rendered from Markdown at build time. */
    doc: string;
    symbols: ApiSymbol[];
  }
  const model: { modules: ApiModule[] };
  export default model;
}

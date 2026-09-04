declare module '*/api.generated.json' {
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
    doc: string;
    symbols: ApiSymbol[];
  }
  const model: { modules: ApiModule[] };
  export default model;
}

declare module 'monaco-editor/esm/vs/basic-languages/_.contribution' {
  export function loadLanguage(languageId: string): Promise<void>;
  export function registerLanguage(def: {
    readonly id: string;
    readonly extensions?: readonly string[];
    readonly aliases?: readonly string[];
    readonly mimetypes?: readonly string[];
    readonly filenames?: readonly string[];
    readonly firstLine?: string;
    readonly loader: () => Promise<{ readonly conf: unknown; readonly language: unknown }>;
  }): void;
}

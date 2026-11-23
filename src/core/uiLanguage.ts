export type UiLanguage = 'tr' | 'en';

const STORAGE_KEY = 'file:ui-language';
const MENU_LABELS: Record<string, string> = {
  'menu-file': 'File',
  'menu-edit': 'Edit',
  'menu-selection': 'Selection',
  'menu-view': 'View',
  'menu-go': 'Git',
  'menu-run': 'Run',
  'menu-terminal': 'Terminal',
  'menu-help': 'Help',
  'menu-ai': 'AI',
  'menu-browser': 'Browser',
};

let language: UiLanguage = 'tr';

export function initUiLanguage(): void {
  try {
    language = localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'tr';
  } catch {
    language = 'tr';
  }
  document.documentElement.lang = language;
}

export function uiLanguage(): UiLanguage {
  return language;
}

export function uiText(turkish: string, english: string): string {
  return language === 'en' ? english : turkish;
}

export function uiMenuLabel(id: string, fallback: string): string {
  if (language !== 'en') return fallback;
  return MENU_LABELS[id] ?? fallback;
}

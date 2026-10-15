export type PlanMode = 'plan' | 'build';
export type EffortLevel = 'low' | 'medium' | 'ultra';

export type EffortPreset = {
  readonly maxTokens: number;
  readonly temperature: number;
  readonly label: string;
};

export const EFFORT_PRESETS: Record<EffortLevel, EffortPreset> = {
  low: { maxTokens: 128, temperature: 0.2, label: 'Düşük' },
  medium: { maxTokens: 256, temperature: 0.4, label: 'Orta' },
  ultra: { maxTokens: 1024, temperature: 0.7, label: 'Ultra' },
};

export const DEFAULT_MODE: PlanMode = 'plan';
export const DEFAULT_EFFORT: EffortLevel = 'medium';

export function modeLabel(mode: PlanMode): string {
  return mode === 'plan' ? 'Plan' : 'Yapım';
}

export function effortLabel(effort: EffortLevel): string {
  return EFFORT_PRESETS[effort].label;
}

/** Uzak modele gömülecek davranış kuralları (F8'de system prompt'a eklenir). */
export function modeRules(mode: PlanMode): string {
  if (mode === 'plan') {
    return [
      'PLAN MODU: Dosyalara dokunma, kod yazma.',
      'Önce proje bağlamını incele, sonra adım adım planı Türkçe anlat.',
      'Her dosya değişikliği için diff önizlemesi üret; onay almadan uygulama.',
    ].join('\n');
  }
  return [
    'YAPIM MODU: Planı doğrudan uygula.',
    'Değişiklikleri yalnızca aktif proje kökü altındaki dosyalara yaz.',
    'Her dosya için tam güncellenmiş içeriği diff bloğuyla ver.',
  ].join('\n');
}

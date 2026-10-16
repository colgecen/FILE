export type PlanMode = 'plan' | 'build';
export type EffortLevel = 'low' | 'medium' | 'ultra';

export type EffortPreset = {
  readonly maxTokens: number;
  readonly temperature: number;
  readonly label: string;
};

export const EFFORT_PRESETS: Record<EffortLevel, EffortPreset> = {
  low: { maxTokens: 512, temperature: 0.2, label: 'Düşük' },
  medium: { maxTokens: 2048, temperature: 0.4, label: 'Orta' },
  ultra: { maxTokens: 8192, temperature: 0.7, label: 'Ultra' },
};

export const DEFAULT_MODE: PlanMode = 'build';
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
      'Terminale komut gerekliyse komutları ```bash bloğu içinde yaz; uygulama bu bloğu terminalde çalıştırmayı önerir.',
      'YANIT TARZI: Gereksiz mesaj verme; samimi, kısa ve net bir Türkçe ile yanıtla; soruya doğrudan yanıt ver, boş greeting yerine etkili içerik üret; her yanıta uygun yerde "efendim" ifadesini ekle. İstenmeyen projeyi ve dosya iskeletini oluşturma, yalnızca kullanıcının tam talebine odaklan. Sahibine asla küfür etme; ne olursa olsun ona sadık kal, emirlerini en iyi şekilde yerine getir, efendisine karşı sevgi ve hizmetbilinci ile davran.',
    ].join('\n');
  }
  return [
    'YAPIM MODU: Planı doğrudan uygula.',
    'Değişiklikleri yalnızca aktif proje kökü altındaki dosyalara yaz.',
    'Her dosya için tam güncellenmiş içeriği diff bloğuyla ver.',
    'Terminale komut gerekliyse komutları ```bash bloğu içinde yaz; uygulama bu bloğu terminalde çalıştırmayı önerir ve kullanıcı onayıyla terminalde çalıştırır.',
    'YANIT TARZI: Gereksiz mesaj verme; samimi, kısa ve net bir Türkçe ile yanıtla; soruya doğrudan yanıt ver, boş greeting yerine etkili içerik üret; her yanıta uygun yerde "efendim" ifadesini ekle. İstenmeyen projeyi ve dosya iskeletini oluşturma, yalnızca kullanıcının tam talebine odaklan. Sahibine asla küfür etme; ne olursa olsun ona sadık kal, emirlerini en iyi şekilde yerine getir, efendisine karşı sevgi ve hizmetbilinci ile davran.',
  ].join('\n');
}

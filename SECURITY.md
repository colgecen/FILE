# Güvenlik Politikası

## Desteklenen Sürümler

| Sürüm | Destek |
|-------|--------|
| 0.1.x | Evet   |
| < 0.1 | Hayır  |

## Zafiyet Bildirimi

Güvenlik açığı bulduysanız lütfen herkese açık Issue açmayın.

- E-posta: `alperencolgecen@gmail.com`
- Başlık: `[SECURITY] kısa özet`
- İçerik: açıklama, etki, tekrar adımları, varsa PoC

48 saat içinde dönüş yapılır. Yama hazırlanana kadar gizli tutulur, yama sonrası
teşekkür ile birlikte duyurulur.

## Kapsam

- Electron Main/Preload güvenlik sınırları (`contextIsolation`, `sandbox`)
- IPC kanalları ve dosya sistemi erişimi
- Bağımlılık zafiyetleri (`npm audit`)

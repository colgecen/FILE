# Faz Komutları — Yapay Zekâya Verilecek Hazır Promptlar

> Bu dosya, projenin kodlama işini başka bir yapay zekâya yaptırmak için hazırlanmış
> faz bazlı komut (prompt) şablonlarını içerir.
> Kural: **her fazın promptunu ayrı ayrı verin**; bir ajan oturumunda en fazla bir faz
> işletilir. Her görev (checkbox) tek commit'tir. Doküman kuralları zorunludur.

## Genel Ön Bilgi (her fazın başına eklenir)

```text
Bu depo, klavye-öncelikli bir masaüstü kod editörü projesidir.
Çalışmaya başlamadan önce sırasıyla okumak ZORUNLUDUR:
AGENTS.md → ARCHITECTURE.md → DECISIONS.md → TODO.md
Bu dosyalardaki kurallar bağlayıcıdır:
- Her görev (TODO.md'deki her checkbox) = AYRI bir commit; commit mesajı Türkçe.
- Commit mesajları TODO.md'de her görevin altında yazılıdır, birebir kullanılır.
- Her commit'ten önce: npm run typecheck + npm run lint + (test varsa) npm test + npm run build.
- Marka/özel proje adı hiçbir yerde geçmez. Kırmızı yalnızca hata. border-radius: 0.
- Tuş eşlemeleri Keymap kaydından; IPC yalnızca window.api (preload).
Ortam (gerekirse PATH'te node yok):
  export PATH="$HOME/node/bin:$PATH"
  node --version  → v24.x olmalı
İlk çalıştırmada 'npm install' Electron binary'sini indirir (internet gerekir).
Görevini tamamladığında: yaptığın görevleri, commit listesini ve doğrulama
sonuçlarını (typecheck/lint/build) özetle.
```

---

## Faz 1 — Proje İskeleti (20 görev)

```text
<GENEL ÖN BİLGİ>

Görevin: TODO.md Faz 1 (Proje İskeleti, 20 görev) sırayla ve özenle yapılacak.
Başlamadan önce depodaki mevcut durumu da kontrol et (git status, git log).
NOT: varsayılan editör başlangıç ekranını (Vite logosu vb.) KULLANMA; amacımız
ilk pencerede siyah zemin. Faz 1 sonunda npm run dev açılan pencerede:
- siyah zemin + 1px vurgu mavisi çerçeve + keskin köşeler görünüyor olmalı.
Faz 1 bitince her görevin checkbox'ını [x] yap, son durumu ve komut çıktılarını özetle.
```

---

## Faz 2 — Çekirdek Katman (21 görev)

```text
<GENEL ÖN BİLGİ>

Görevin: TODO.md Faz 2 (Çekirdek Katman, 21 görev) sırayla ve özenle yapılacak.
Özellikle dikkat:
- CommandRegistry ve Keymap birbirinden bağımsız çalışmalı (DECISIONS D-005).
- IPC kanal adları ARCHITECTURE Bölüm 3'teki tabloyla birebir aynı olmalı.
- window.api imzaları tip tanımlı; renderer'da require/fs KULLANILMAZ.
- Odak bölgesi (FocusZone) tipleri şimdiden tanımlanacak; bölge geçişleri yalnızca komutla.
Faz 2 bitince: npm run typecheck + lint + build temiz; görev checkbox'larını [x] yap ve özetle.
```

---

## Faz 3 — Menü Çubuğu (13 görev)

```text
<GENEL ÖN BİLGİ>

Görevin: TODO.md Faz 3 (Menü Çubuğu, 13 görev) sırayla ve özenle yapılacak.
Mevcut uygulamanın üzerine ekleme yap; çekirdek katman (Faz 2) hazır kabul edilir.
Doğrulaman gereken klavye akışı (elle veya testle):
- F1 menü çubuğuna odaklanır; tekrar basınca kapatır.
- Sol/sağ yön tuşları üst butonlar arasında dolaşır.
- Odaklanılan butonun alt menüsü otomatik açılır.
- Tab ve yukarı/aşağı yön tuşları alt menüde gezinir; Enter çalıştırır; Esc adım adım kapatır.
- Alt menü açıkken üst butonlara odak kaçamaz (kilit).
Tüm menü öğeleri CommandRegistry komutlarına bağlı olmalı; çalıştırılamayanlar
"Yakında" işaretlenmeli. Görev checkbox'larını [x] yap ve özetle.
```

---

## Faz 4 — Komut Paleti / Ctrl+I (11 görev)

```text
<GENEL ÖN BİLGİ>

Görevin: TODO.md Faz 4 (Komut Paleti / Ctrl+I, 11 görev) sırayla ve özenle yapılacak.
Doğrulaman gereken akışlar:
- Ctrl+I ekran ortasında paleti açar, giriş kutusu odaklıdır.
- Yazılan metin komut adlarında/kısaltmalarda bulanık filtre ile sonuç verir.
- Yukarı/aşağı + Enter seçim çalıştırır; Esc kapatır ve odak önceki bölgeye döner.
- PALETİN EN KRİTİK KOMUTU: 'tree' yazıp Enter'a basınca sol tarafta, pencere
  genişliğinin 1/7'sini kaplayan dosya gezgini açılır ve odak gezgine geçer.
Görev checkbox'larını [x] yap, akışları çalıştırıp özetle.
```

---

## Faz 5 — Dosya Gezgini / ExplorerView (14 görev)

```text
<GENEL ÖN BİLGİ>

Görevin: TODO.md Faz 5 (Dosya Gezgini, 14 görev) sırayla ve özenle yapılacak.
Bu fazın gezinme modeli KULLANICI SPESİFİKASYONUdur, birebir uygulanmalı:
- KLASÖRLER arasında gezinme: F3 tuşu VEYA yön tuşları.
- DOSYALAR arasında gezinme: Tab tuşu VEYA yön tuşları.
- Enter: klasör aç/kapat; dosya → editörde açılır (henüz Monaco yoksa geçici model/satır).
- Esc: gezginden çıkış, odak editöre döner.
Panel: sol tarafta, pencere genişliğinin 1/7'si, sağda 1px vurgu mavisi sınır, keskin köşeler.
Gezgin verisi fs:read-dir IPC'sinden gelir (Faz 2 kanalı hazır kabul edilir).
Görev checkbox'larını [x] yap ve gezinme akışlarını çalıştırıp özetle.
```

---

## Faz 6 — Editör Çekirdeği / EditorCore (13 görev)

```text
<GENEL ÖN BİLGİ>

Görevin: TODO.md Faz 6 (Editör Çekirdeği, 13 görev) sırayla ve özenle yapılacak.
Özellikle dikkat:
- Monaco worker'ları electron-vite kurallarına uygun kurulmalı (dosya protokolü).
- Tema: ARCHITECTURE Bölüm 7.1 tokenları birebir; defineTheme ile tanımlanacak.
  Zemin #03050A · metin beyaz · keyword #00D2FF · string #82AAFF · yorum #4A6B8C ·
  seçim rgba(0,85,255,0.4) · aktif satır rgba(0,210,255,0.05) · teşhis hatası #FF5252.
- İmleç: içi boş blok (block-outline) + sönümlenen mavi iz overlay katmanı.
- JetBrains Mono + fontLigatures: true.
- Sekme/model yönetimi LRU üst sınırlı olmalı (ARCHITECTURE 6.3).
- Editör komutları Keymap üzerinden bağlanır; menü öğeleriyle birebir eşleşir.
Görev checkbox'larını [x] yap, editörü açıp temayı ve imleci doğrula, özetle.
```

---

## Faz 7 — Panel Yönetimi / PaneManager (5 görev)

```text
<GENEL ÖN BİLGİ>

Görevin: TODO.md Faz 7 (PaneManager, 5 görev) sırayla ve özenle yapılacak.
Dikey/yatay bölme komutları View menüsünden ve klavyeden çalışmalı; ara çizgiler
1px vurgu mavisi, köşeler keskin. Aktif panel takibi ve paneller arası gezinme
klavye ile tam yürütülebilmeli. Görev checkbox'larını [x] yap ve özetle.
```

---

## Faz 8 — Durum Çubuğu / StatusBar (5 görev)

```text
<GENEL ÖN BİLGİ>

Görevin: TODO.md Faz 8 (StatusBar, 5 görev) sırayla ve özenle yapılacak.
Göstergeler: dosya adı · satır:sütun · git branch · CPU/RAM · AI durumu (IDLE) ·
hata rozeti (kırmızı, YALNIZCA hata). Font Orbitron; zemin siyah; üst sınır 1px
vurgu mavisi. Telemetri verisi IPC itkisiyle gelir (500 ms throttle). AI durumu
şimdilik sabit IDLE olabilir. Görev checkbox'larını [x] yap ve özetle.
```

---

## Faz 9 — Dosya İşlemleri (5 görev)

```text
<GENEL ÖN BİLGİ>

Görevin: TODO.md Faz 9 (Dosya İşlemleri, 5 görev) sırayla ve özenle yapılacak.
Doğrulaman gereken akışlar:
- Dosya aç: dialog → içerik → sekme/model; hata durumunda merkezî kırmızı gösterge.
- Kaydet / Kaydet As / Tümünü Kaydet; ':w' palet komutu çalışır.
- Kaydetme başarılıysa pencere çerçevesi kısa süre parlar (mavi glow) — animasyon bitti
  geri döner, sürekli yanmaz.
- Hata olursa ilgili panel çerçevesi kırmızı yanıp söner; kırmızı başka yerde KULLANILMAZ.
- Son Kullanılanlar listesi kalıcıdır (yeniden açılışta durur).
Görev checkbox'larını [x] yap ve özetle.
```

---

## Faz 10 — Terminal (5 görev)

```text
<GENEL ÖN BİLGİ>

Görevin: TODO.md Faz 10 (Terminal, 5 görev) sırayla ve özenle yapılacak.
ÖNEMLİ UYARILAR:
- node-pty NATIVE bir modüldür; Electron ABI'sına göre derlemek için
  '@electron/rebuild' adımı gerekir (DECISIONS D-012). Derleme sistemi gerekli
  (python3, make, gcc). Derleme başarısız olursa ZORUNLU: dur, kullanıcıya bildir
  (yapboz deneme yanılma yapma), geçici olarak taklit kabuk ile devam etme kararı
  kullanıcının.
- pty kanalları yalnızca Main Process'te; renderer sanal klavye akışını gönderir.
- Terminal menüsü komutları (yeni/böl/kapat) Keymap ve CommandRegistry üzerinden.
Görev checkbox'larını [x] yap, terminali açıp basit bir komut çalıştırıp özetle.
```

---

## Faz 11 — Gelişmiş Editör Özellikleri (7 görev)

```text
<GENEL ÖN BİLGİ>

Görevin: TODO.md Faz 11 (Gelişmiş Editör Özellikleri, 7 görev) sırayla ve özenle yapılacak.
Çoklu imleç, sütun/dikdörtgen seçim, yer imleri, geri alma ağacı, go-to komutları,
zen modu/tam ekran/kelime sarmalama ve yardım ekranları. Tümü Selection/Go/View/Help
menüsündeki ilgili öğelerle birebir eşleşmeli (Faz 3 katalogu). Tuş eşlemeleri
Keymap'ten; yeni kısayol eklenmezse kullanıcıya sor. Görev checkbox'larını [x] yap ve özetle.
```

---

## Faz 12 — Yerel Yapay Zekâ (ileri faz · 6 görev)

```text
<GENEL ÖN BİLGİ>

Görevin: TODO.md Faz 12 (Yerel Yapay Zekâ, 6 görev) sırayla ve özenle yapılacak.
KRİTİK UYARI: Gerçek model entegrasyonu/motor seçimi KULLANICI KARARI bekliyor
(TODO.md "Kullanıcı Kararı Bekleyenler"). Bu fazda:
- Tip kontratları (AIStatus, ModelInfo, ChatMessage vb.), worker altyapısı,
  menü kataloğu, model seç/durum yönetimi, indirme akışı UI/state düzeyinde,
  StatusBar entegrasyonu yapılır.
- HİÇBİR gerçek modeli indirmeye/çalıştırmaya çalışma; motor ADR'si kullanıcı onayı
  olmadan yazılmaz.
Görev checkbox'larını [x] yap ve özetle.
```

---

## Faz 13 — Test ve Parlatma (6 görev)

```text
<GENEL ÖN BİLGİ>

Görevin: TODO.md Faz 13 (Test ve Parlatma, 6 görev) sırayla ve özenle yapılacak.
Testler Vitest + React Testing Library; IPC mock'ları ile. Kapsanacak akışlar:
- Ctrl+I palet → tree → gezgin açılışı ve odak transferi.
- F1 menü modeli klavye senaryoları (gezinme, kilit, Esc katmanı).
- Gezgin gezinmesi (F3/Tab/yön tuşları, Enter/Esc).
- Dosya aç/kaydet (IPC mock).
Son iki görevde tam zincir (typecheck + lint + build) ve gerçek Electron başlatma
doğrulaması yapılır (pencere açılır, telemetri itkisi gelir, kapanış temiz).
Görev checkbox'larını [x] yap ve özetle.
```

---

## İş Akışı Notları (ajanı çalıştırırken)

- Her fazı ayrı oturumda/komutla başlatın; fazlar arası durum beklentisi zarar görmesin.
- Bir faz bittiğinde `git log --oneline` ile commit sayısını kontrol edin: o fazın
  görev sayısı kadar yeni commit olmalı.
- Ajan doğrulama zincirini atlarsa veya tek commit'e sıkıştırırsa geri gönderin.
- Gerekirse faz içi son birkaç görev için "kaldığın yerden devam et" komutu verin:
  `Şimdiye kadarki commit geçmişini incele, kalan görevlere Faz N'den devam et.`
- 135 commit hedefi: Faz 0 (4, tamamlandı) + Faz 1–13 (131) = 135.
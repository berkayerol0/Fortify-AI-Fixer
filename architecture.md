# Katmanlı Mimari Dokümantasyonu

## Katmanlar

1. **API/Service Katmanı** (`src/api/`):
   - Dış servislerle (ör. Gemini API) iletişim sağlar.
   - Sadece `types` katmanına bağımlı olabilir.

2. **Core/Business Logic Katmanı** (`src/core/`):
   - Ana iş kuralları ve mantık burada bulunur.
   - Sadece `api` ve `types` katmanlarına bağımlı olabilir.

3. **UI/Command Katmanı** (`src/commands/`, `src/tree/`):
   - VSCode ile etkileşim, kullanıcıya görünen kısımlar.
   - `core`, `api` ve `types` katmanlarına bağımlı olabilir.

4. **Types/Model Katmanı** (`src/types/`):
   - Tip tanımları ve modeller.
   - Hiçbir katmana bağımlı olmamalı.

## Bağımlılık Kuralları

- Her katman sadece bir alt katmana bağımlı olabilir.
- Döngüsel bağımlılıklar olmamalı.
- Örnek bağımlılık zinciri:
  - `commands` → `core` → `api` → `types`

## Kontrol Listesi

- [ ] `core` klasörü, `commands` veya `tree` klasöründen import yapmıyor.
- [ ] `api` klasörü, sadece `types` import ediyor.
- [ ] `types` hiçbir katmandan import almıyor.

---

Bu kurallara uyulup uyulmadığı düzenli olarak kontrol edilmelidir. Otomatik analiz için ESLint veya Madge gibi araçlar önerilir. 
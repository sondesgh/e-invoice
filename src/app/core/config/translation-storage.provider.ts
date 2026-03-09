import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANG,
  getValidatedStoredLanguage,
  storeLanguage,
  SupportedLanguage,
} from './translation.config';

/**
 * TranslationStorageService
 *
 * Migré depuis `translationStorageProvider` (translation-storage.provider.js).
 *
 * Le legacy était une factory AngularJS injectée dans `$translateProvider.useStorage()`
 * avec deux méthodes `get(name)` et `put(name, value)`.
 *
 * En Angular 19 ce service est un `@Injectable` standalone qui :
 *   - lit/écrit le cookie `NG_TRANSLATE_LANG_KEY` (même clé que le legacy)
 *   - valide la langue contre `SUPPORTED_LANGUAGES`
 *   - expose `applyStoredLanguage()` pour synchroniser `TranslateService`
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * Correspondance legacy → Angular
 * ──────────────────────────────────────────────────────────────────────────────
 * `get(name)`        → `get()`             (nom fixe : LANG_STORAGE_KEY)
 * `put(name, value)` → `put(lang)`         (nom fixe : LANG_STORAGE_KEY)
 * —                  → `applyStoredLanguage()` (nouveau : sync TranslateService)
 */
@Injectable({ providedIn: 'root' })
export class TranslationStorageService {
  private readonly translate = inject(TranslateService);

  /**
   * Retourne la langue persistée, en la réinitialisant à `DEFAULT_LANG` si invalide.
   * Miroir de `translationStorageProvider.get(name)`.
   */
  get(): SupportedLanguage {
    return getValidatedStoredLanguage();
  }

  /**
   * Persiste la langue dans le cookie.
   * Miroir de `translationStorageProvider.put(name, value)`.
   */
  put(lang: SupportedLanguage | string): void {
    storeLanguage(lang);
  }

  /**
   * Applique la langue stockée à `TranslateService`.
   * À appeler au démarrage ou après un changement de compte.
   */
  applyStoredLanguage(): void {
    const lang = this.get();
    this.translate.use(lang);
    storeLanguage(lang);
  }
}
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { storeLanguage, getValidatedStoredLanguage } from '@core/config/translation.config';

/**
 * Langues supportées par l'application.
 * Miroir de la constante AngularJS `LANGUAGES` (language.constants.js).
 * Seul 'fr' était actif dans le legacy — 'ar' ajouté car présent dans i18n/.
 */
export const SUPPORTED_LANGUAGES: string[] = ['fr', 'ar'];

/**
 * Mapping code ISO → libellé natif.
 * Migré depuis le filtre AngularJS `findLanguageFromKey` (language.filter.js).
 * Le mapping complet est conservé pour compatibilité future.
 */
export const LANGUAGE_LABELS: Record<string, string> = {
  ar:      'Arabe',
  ca:      'Català',
  cs:      'Český',
  da:      'Dansk',
  de:      'Deutsch',
  el:      'Ελληνικά',
  en:      'English',
  es:      'Español',
  fr:      'Français',
  gl:      'Galego',
  hu:      'Magyar',
  hi:      'हिंदी',
  it:      'Italiano',
  ja:      '日本語',
  ko:      '한국어',
  mr:      'मराठी',
  nl:      'Nederlands',
  pl:      'Polski',
  'pt-br': 'Português (Brasil)',
  'pt-pt': 'Português',
  ro:      'Română',
  ru:      'Русский',
  sk:      'Slovenský',
  sv:      'Svenska',
  ta:      'தமிழ்',
  tr:      'Türkçe',
  'zh-cn': '中文（简体）',
  'zh-tw': '繁體中文',
};

/**
 * LanguageService
 *
 * Migré depuis `JhiLanguageService` (language.service.js) +
 * `JhiLanguageController` (language.controller.js) +
 * filtre `findLanguageFromKey` (language.filter.js).
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * Correspondance legacy → Angular
 * ──────────────────────────────────────────────────────────────────────────────
 * `JhiLanguageService.getAll()`  → `getAll()`    (synchrone : plus de $q.defer)
 * `JhiLanguageService.getCurrent()` → `getCurrent()` (synchrone : translate.currentLang)
 * `JhiLanguageController.changeLanguage(key)` → `change(key)`
 * filtre `findLanguageFromKey`   → `getLabel(code)`
 * `tmhDynamicLocale.set(key)`    → supprimé (géré par Angular registerLocaleData)
 *
 * Utilisé dans :
 *  - NavbarComponent  : sélecteur de langue
 *  - SettingsComponent : paramètres utilisateur
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  /** Retourne toutes les langues supportées (synchrone). */
  getAll(): string[] {
    return SUPPORTED_LANGUAGES;
  }

  /** Retourne la langue courante. */
  getCurrent(): string {
    return this.translate.currentLang ?? this.translate.defaultLang ?? 'fr';
  }

  /**
   * Change la langue active.
   * Miroir de `$translate.use(key)` + `tmhDynamicLocale.set(key)`.
   * Persiste aussi le choix dans le cookie (miroir de `translationStorageProvider`).
   */
  change(langKey: string): void {
    this.translate.use(langKey);
    storeLanguage(langKey);
  }

  /**
   * Libellé natif d'un code langue.
   * Miroir du filtre AngularJS `findLanguageFromKey`.
   * Ex : `getLabel('fr')` → `'Français'`
   */
  getLabel(code: string): string {
    return LANGUAGE_LABELS[code] ?? code;
  }
}
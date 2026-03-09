import { inject, LOCALE_ID, Provider, APP_INITIALIZER } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { registerLocaleData, DOCUMENT } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeAr from '@angular/common/locales/ar';

// ── Constantes ───────────────────────────────────────────────────────────────

/** Langue par défaut (miroir de `$translateProvider.preferredLanguage('fr')`). */
export const DEFAULT_LANG = 'fr';

/**
 * Langues supportées — miroir de la constante AngularJS `LANGUAGES`.
 * 'ar' ajouté car présent dans le répertoire i18n/.
 */
export const SUPPORTED_LANGUAGES = ['fr', 'ar', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Clé de cookie/stockage — miroir de `translationStorageProvider` qui utilisait
 * `$cookies.putObject('NG_TRANSLATE_LANG_KEY', value)`.
 */
export const LANG_STORAGE_KEY = 'NG_TRANSLATE_LANG_KEY';

// ── Locale Angular ───────────────────────────────────────────────────────────
// Miroir de `tmhDynamicLocaleProvider.localeLocationPattern('i18n/angular-locale_{{locale}}.js')`
// En Angular 19 les locales sont importées statiquement (plus de chargement dynamique).
registerLocaleData(localeFr, 'fr');
registerLocaleData(localeAr, 'ar');

// ── Providers ────────────────────────────────────────────────────────────────

/**
 * Fournit `LOCALE_ID` à Angular (pipes date/number/currency).
 * À inclure dans `appConfig.providers` via spread : `...translationProviders()`.
 */
export function translationProviders(): Provider[] {
  return [
    { provide: LOCALE_ID, useValue: DEFAULT_LANG },
  ];
}

// ── APP_INITIALIZER factory ──────────────────────────────────────────────────

/**
 * Initialise la langue active AVANT le premier rendu.
 *
 * Miroir du run-block AngularJS :
 *   $translate.use(translationStorageProvider.get('NG_TRANSLATE_LANG_KEY'))
 *
 * Appelé par APP_INITIALIZER dans app.config.ts :
 * ```ts
 * {
 *   provide:    APP_INITIALIZER,
 *   useFactory: initTranslation,
 *   deps:       [TranslateService],
 *   multi:      true,
 * }
 * ```
 */
export function initTranslation(translate: TranslateService): () => Promise<void> {
  return (): Promise<void> => {
    translate.setDefaultLang(DEFAULT_LANG);

    const stored = getStoredLanguage();
    const lang: SupportedLanguage =
      (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)
        ? (stored as SupportedLanguage)
        : DEFAULT_LANG;

    // translate.use() retourne Observable<any> — on le convertit en Promise
    return translate.use(lang).toPromise().then(() => undefined);
  };
}

// ── Titre de la page (translationHandler.updateTitle) ───────────────────────

/**
 * Met à jour `document.title` avec la traduction de `global.title`.
 *
 * Miroir de `translationHandler.updateTitle()` du legacy AngularJS.
 * À appeler depuis `AppComponent.ngOnInit()` sur l'événement
 * `LangChangeEvent` de TranslateService.
 *
 * ```ts
 * // app.component.ts
 * ngOnInit(): void {
 *   this.translate.onLangChange.subscribe(() => updateDocTitle(this.translate));
 *   updateDocTitle(this.translate); // initial
 * }
 * ```
 */
export function updateDocTitle(
  translate: TranslateService,
  titleKey: string = 'global.title',
): void {
  translate.get(titleKey).subscribe((title: string) => {
    if (typeof document !== 'undefined') {
      document.title = title;
    }
  });
}

// ── Cookie helpers ───────────────────────────────────────────────────────────
// Miroir de `translationStorageProvider` (translation-storage.provider.js) qui
// utilisait `$cookies.getObject / putObject` d'AngularJS.

/**
 * Lit la langue persistée depuis le cookie `NG_TRANSLATE_LANG_KEY`.
 * Retourne `DEFAULT_LANG` si le cookie est absent ou invalide.
 */
export function getStoredLanguage(): string {
  if (typeof document === 'undefined') return DEFAULT_LANG;
  const match = document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${LANG_STORAGE_KEY}=`));

  if (!match) return DEFAULT_LANG;
  try {
    const raw = match.split('=').slice(1).join('='); // gère les = dans la valeur
    return JSON.parse(decodeURIComponent(raw)) ?? DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/**
 * Persiste la langue dans le cookie `NG_TRANSLATE_LANG_KEY`.
 * Miroir de `translationStorageProvider.put(name, value)`.
 */
export function storeLanguage(lang: string): void {
  if (typeof document === 'undefined') return;
  document.cookie =
    `${LANG_STORAGE_KEY}=${encodeURIComponent(JSON.stringify(lang))};path=/;SameSite=Lax`;
}

/**
 * Valide et retourne la langue stockée ; reset vers DEFAULT_LANG si invalide.
 * Miroir de `translationStorageProvider.get(name)` avec le log `$log.info`.
 */
export function getValidatedStoredLanguage(): SupportedLanguage {
  const stored = getStoredLanguage();
  if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
    console.info(
      `Resetting invalid cookie language "${stored}" to preferred language "${DEFAULT_LANG}"`
    );
    storeLanguage(DEFAULT_LANG);
    return DEFAULT_LANG;
  }
  return stored as SupportedLanguage;
}
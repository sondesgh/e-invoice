import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorHandlerInterceptor } from './core/interceptors/error-handler.interceptor';
import { notificationInterceptor } from './core/interceptors/notification.interceptor';
import { multiTranslateLoaderFactory } from './core/config/multi-translate-loader';
import { initTranslation, translationProviders } from './core/config/translation.config';

/**
 *
 *  ── Traductions ─────────────────────────────────────────────────────────────
 * Le legacy utilisait `$translatePartialLoader` avec :
 *   urlTemplate: 'i18n/{lang}/{part}.json'
 * soit ~42 fichiers JSON chargés à la demande par état UI.
 *
 * En Angular 19 on utilise `MultiTranslateLoader` (custom) qui :
 *   1. Charge en parallèle TOUS les fichiers  assets/i18n/{lang}/*.json
 *   2. Les fusionne (deep-merge) en un seul objet de traductions
 *   3. Ignore silencieusement les fichiers absents (catchError → {})
 *
 * provideAppInitializer garantit que les traductions sont chargées AVANT
 * le premier rendu (miroir du run-block AngularJS `$translate.use`).
 *
 *  - RECAPTCHA_V3_SITE_KEY supprimé : ng-recaptcha incompatible Angular 19
 *    → reCAPTCHA géré nativement via RecaptchaService (script Google dans index.html)
 *    → captchaSiteKey externalisé dans environment.ts
 */
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, 'assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        // Order important: auth token → error handler → notification
        authInterceptor,         // token JWT sur chaque requête
        errorHandlerInterceptor, // gestion erreurs HTTP globale
        notificationInterceptor  // alertes serveur (X-portailElFatooraApp-alert)
      ])
    ),
    // ── Locale Angular (date, number, currency pipes) ────────────────────────
    ...translationProviders(),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'fr',
        loader: {
          provide: TranslateLoader,
          useFactory: multiTranslateLoaderFactory,
          deps: [HttpClient]
        }
      })
    ),
    // ── provideAppInitializer : langue active avant le premier rendu ─────────
    // Miroir du run-block AngularJS translationHandler.initialize() +
    // $translate.use(translationStorageProvider.get('NG_TRANSLATE_LANG_KEY'))
    provideAppInitializer(() => {
      const translateService = inject(TranslateService);
      return initTranslation(translateService)();
    }),
  ],
};
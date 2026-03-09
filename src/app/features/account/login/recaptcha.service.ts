import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

/**
 * RecaptchaService — Angular 19, zéro dépendance tierce
 *
 * Remplace : vcRecaptcha (AngularJS) + ng-recaptcha (incompatible Angular 19)
 * Stratégie : chargement dynamique du script Google, rendu dans un élément DOM,
 *             exposition d'un Observable<string> pour le token.
 *
 * Prérequis angular.json :
 *   Aucun — le script est chargé dynamiquement par ce service.
 *   (Pas besoin d'ajouter quoi que ce soit dans scripts[])
 */

/*declare global {
  interface Window {
    grecaptcha: ReCaptchaV2.ReCaptcha;
    onRecaptchaLoaded: () => void;
  }
}*/
// ── Typage inline — pas besoin de @types/grecaptcha 
// ReCaptchaV2 n'est pas disponible sans le package externe.
// On déclare uniquement ce qu'on utilise réellement.
interface GreCaptchaParams {
  sitekey:            string;
  callback:           (token: string) => void;
  'expired-callback': () => void;
  theme?:             'light' | 'dark';
  size?:              'normal' | 'compact';
}

interface GreCaptchaInstance {
  render(container: HTMLElement | string, params: GreCaptchaParams): number;
  reset(widgetId?: number): void;
  getResponse(widgetId?: number): string;
  execute(widgetId?: number): void;
}

declare global {
  interface Window {
    grecaptcha:        GreCaptchaInstance;   // ← plus de ReCaptchaV2.ReCaptcha
    onRecaptchaLoaded: () => void;
  }
}

@Injectable({ providedIn: 'root' })
export class RecaptchaService {
  private readonly http = inject(HttpClient);

  /** Clé publique reCAPTCHA v2 (même valeur que dans login.controller.js) */
  readonly siteKey = '6LfVRpUUAAAAALmoogDqCEVQTiOwUTHpVeTispE2';

  private _apiReady = false;
  private _readyCallbacks: Array<() => void> = [];

  constructor() {
    this._loadScript();
  }

  // ── Chargement dynamique du script Google ─────────────────────────────────

  private _loadScript(): void {
    if (document.querySelector('script[src*="recaptcha/api.js"]')) {
      this._apiReady = true;
      return;
    }

    window.onRecaptchaLoaded = () => {
      this._apiReady = true;
      this._readyCallbacks.forEach(cb => cb());
      this._readyCallbacks = [];
    };

    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoaded&render=explicit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  /**
   * Rend le widget reCAPTCHA dans `container`.
   * Retourne l'ID du widget (utilisé pour reset/getResponse).
   */
  render(container: HTMLElement, callback: (token: string) => void, expiredCallback?: () => void): Promise<number> {
    return new Promise((resolve) => {
      const doRender = () => {
        const widgetId = window.grecaptcha.render(container, {
          sitekey:          this.siteKey,
          callback:         callback,
          'expired-callback': expiredCallback ?? (() => {}),
        });
        resolve(widgetId);
      };

      if (this._apiReady && window.grecaptcha) {
        doRender();
      } else {
        this._readyCallbacks.push(doRender);
      }
    });
  }

  /** Réinitialise le widget (après erreur ou expiration). */
  reset(widgetId: number): void {
    if (window.grecaptcha) {
      window.grecaptcha.reset(widgetId);
    }
  }

  /** Récupère le token courant du widget. */
  getResponse(widgetId: number): string {
    return window.grecaptcha?.getResponse(widgetId) ?? '';
  }

  // ── Vérification côté serveur (RecaptchaManagementController.java) ────────

  /**
   * POST /recaptcha/verifyUser
   * Correspond à RecaptchaManagementController.viewAllItems()
   */
  verifyToken(token: string): Observable<boolean> {
    return this.http.post<boolean>('recaptcha/verifyUser', token);
  }
}

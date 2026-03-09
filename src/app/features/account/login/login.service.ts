import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SignatoryResult {
  data: boolean | unknown;
}

export interface CaptchaResult {
  res: boolean;
  status: string;
  expired?: boolean;
}

/**
 * LoginService
 *
 * Migré depuis `login.service.js`.
 *
 * Méthodes portées :
 *  - `open()`         → `navigateToLogin()` — redirige vers /login (remplace $state.go('firstpage'))
 *  - `getSignatory()` → HTTP GET api/signatories/find/:email/:serialNumber/:username
 *  - `checkCaptcha()` → HTTP GET captcha/checkCaptchaGen?captcha=&type=
 *  - `verifCaptcha()` → HTTP POST recaptcha/verifyUser
 *
 * Note : `authByCard()` n'était pas dans la factory, juste appelé dans LoginCardController.
 * La logique carte est dans `LoginCardComponent`.
 */
@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  /**
   * Miroir de `LoginService.open()` → `$state.go('firstpage')`.
   * Utilisé dans activate + register pour rediriger vers la page de connexion.
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Vérifie si un signataire existe pour l'email + numéro de série + username.
   * Utilisé par `LoginCardComponent` (authentification par carte).
   */
  getSignatory(
    email: string,
    serialNumber: string,
    username: string
  ): Observable<SignatoryResult> {
    return this.http.get<SignatoryResult>(
      `api/signatories/find/${email}/${serialNumber}/${username}`
    );
  }

  /**
   * Vérifie le captcha image côté serveur.
   * GET captcha/checkCaptchaGen?captcha=xxx&type=login
   */
  checkCaptcha(captcha: string, type: string): Observable<CaptchaResult> {
    return this.http.get<CaptchaResult>('captcha/checkCaptchaGen', {
      params: { captcha, type },
    });
  }

  /**
   * Vérifie un reCAPTCHA Google.
   * POST recaptcha/verifyUser
   */
  verifCaptcha(captchaToken: string): Observable<unknown> {
    return this.http.post('recaptcha/verifyUser', captchaToken);
  }
}

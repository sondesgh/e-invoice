import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '../../../../core/services/auth.service';
import { LoginService, CaptchaResult } from '../../login/login.service';

/**
 * ResetRequestComponent
 *
 * Migré depuis `RequestResetController` + `reset.request.html`.
 *
 * Flux conservé (identique au login) :
 *  1. Validation captcha `captcha/reset` (GET captcha/checkCaptchaGen?type=resetPass)
 *  2. `Auth.resetPasswordInit(email)` → `authService.resetPasswordInit(email)`
 *  3. Gestion de l'erreur 400 "e-mail address not registered" → message FR
 *
 * - Image captcha spécifique : `captcha/reset` (différent de `captcha` login)
 * - Rafraîchissement via `captchaBuster` signal (remplace `onclick` inline)
 * - `$timeout → focus` → `autofocus` HTML natif
 *
 * Route : /reset/request   (authorities: [])
 */
@Component({
  selector: 'app-reset-request',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './reset-request.component.html',
})
export class ResetRequestComponent {
  private readonly authService  = inject(AuthService);
  private readonly loginService = inject(LoginService);

  email   = '';
  captcha = '';

  readonly success      = signal(false);
  readonly errorShow    = signal(false);
  readonly errorMessage = signal('');

  readonly captchaBuster = signal(Math.random());

  get captchaUrl(): string {
    return `captcha/reset?cacheBuster=${this.captchaBuster()}`;
  }

  refreshCaptcha(): void {
    this.captchaBuster.set(Math.random());
    this.captcha = '';
  }

  requestReset(): void {
    // Validation captcha vide (double garde comme dans le legacy)
    if (!this.captcha) {
      this.success.set(false);
      this.errorShow.set(true);
      this.errorMessage.set('Saisir le Captcha de verification !');
      return;
    }

    this.errorMessage.set('');
    this.errorShow.set(false);

    this.loginService.checkCaptcha(this.captcha, 'resetPass').subscribe({
      next: (res: CaptchaResult) => {
        if (!res.res) {
          this.success.set(false);
          this.errorShow.set(true);
          this.errorMessage.set(res.status);
          if (res.expired) this.refreshCaptcha();
          this.captcha = '';
        } else {
          this._doResetInit();
        }
      },
      error: (err) => {
        this.success.set(false);
        this.errorShow.set(true);
        this.errorMessage.set(err?.message ?? 'Erreur captcha');
        this.refreshCaptcha();
        this.captcha = '';
      },
    });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _doResetInit(): void {
    this.authService.resetPasswordInit(this.email).subscribe({
      next: () => {
        this.success.set(true);
        this.errorShow.set(false);
      },
      error: (res) => {
        this.success.set(false);
        this.errorShow.set(true);
        this.refreshCaptcha();
        this.captcha = '';

        if (res.status === 400 && res.error === 'e-mail address not registered') {
          this.errorMessage.set(
            "Nous n'avons pas pu trouver votre compte avec cette information! Merci de vérifier et de réessayer"
          );
        } else {
          this.errorMessage.set(res.error ?? res.message ?? 'Erreur lors de la réinitialisation');
        }
      },
    });
  }
}

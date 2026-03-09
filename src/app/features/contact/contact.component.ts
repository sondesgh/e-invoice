import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '@core/services/notification.service';
import { LoginService, CaptchaResult } from '../account/login/login.service';
import { AlertComponent } from '@shared/components/alert/alert.component';

interface ContactForm {
  name:       string;
  email:      string;
  socity:     string;
  coddou:     string;
  subject:    string;
  message:    string;
  tel:        string;
  nbrInvoice: string;
}

/**
 * ContactComponent
 *
 * Migré depuis `contact.html` (utilisé via `ui-router` état séparé).
 * Contient uniquement le formulaire de contact — la section coordonnées
 * est intégrée ici contrairement à la firstpage qui l'inclut aussi.
 *
 * Route : /contact  (authorities: [])
 */
@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, AlertComponent],
  templateUrl: './contact.component.html',
})
export class ContactComponent {
  private readonly authService  = inject(AuthService);
  private readonly alertService = inject(AlertService);
  private readonly loginService = inject(LoginService);

  contact: ContactForm = this._empty();
  captchaContact       = '';

  readonly captchaBuster = signal(Math.random());

  get captchaUrl(): string {
    return `captcha/contact?cacheBuster=${this.captchaBuster()}`;
  }

  refreshCaptcha(): void {
    this.captchaBuster.set(Math.random());
    this.captchaContact = '';
  }

  contactUs(): void {
    if (!this.captchaContact) {
      this.alertService.error("Résoudre Tout d'abord le Captcha de verification !");
      return;
    }

    this.loginService.checkCaptcha(this.captchaContact, 'contact').subscribe({
      next: (res: CaptchaResult) => {
        if (!res.res) {
          this.alertService.error(res.status);
          if (res.expired) this.refreshCaptcha();
          this.captchaContact = '';
        } else {
          this._send();
        }
      },
      error: (err) => {
        this.alertService.error(err?.message ?? 'Erreur captcha');
        this.refreshCaptcha();
        this.captchaContact = '';
      },
    });
  }

  private _send(): void {
    this.authService.sendContactEmail(this.contact as any).subscribe({
      next: () => {
        this.alertService.success('Message envoyé');
        this.contact = this._empty();
        this.refreshCaptcha();
      },
      error: (res) => {
        this.refreshCaptcha();
        this.captchaContact = '';
        if (res.status === 400 && res.error === 'e-mail address not registered') {
          this.alertService.error("Erreur d'envoi: e-mail address non enregistré");
        } else {
          this.alertService.error("Erreur d'envoi");
        }
      },
    });
  }

  private _empty(): ContactForm {
    return { name: '', email: '', socity: '', coddou: '', subject: '', message: '', tel: '', nbrInvoice: '' };
  }
}
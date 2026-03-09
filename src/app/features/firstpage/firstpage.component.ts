import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '@core/services/notification.service';
import { LoginService, CaptchaResult } from '../account/login/login.service';
import { AlertComponent } from '@shared/components/alert/alert.component';

/** Modèle du formulaire de contact. */
interface ContactForm {
  name:        string;
  email:       string;
  socity:      string;
  coddou:      string;
  subject:     string;
  message:     string;
  tel:         string;
  nbrInvoice:  string;
}

/** Modèle pour la recherche de facture. */
interface InvoiceSearch {
  matFisc:      string;
  generatedRef: string;
}

/**
 * FirstpageComponent
 *
 * Migré depuis `FirstpageController` + `firstpage.html` + `SearchServiceController`.
 *
 * La firstpage est la landing page publique. Elle contient :
 *  1. Section hero (si non authentifié) / section home (si authentifié)
 *  2. Section services (présentation)
 *  3. Section recherche facture (SearchServiceController intégré)
 *  4. Section documentation (téléchargements)
 *  5. Section contact (formulaire avec captcha)
 *
 * `ng-switch on vm.isAuthenticated()` → `@if (isAuthenticated())` Angular 19.
 * `SearchServiceController` (contrôleur séparé) → méthodes `search()` intégrées
 *   dans ce composant pour simplifier l'architecture.
 *
 * Route : /firstpage  (authorities: [])
 */
@Component({
  selector: 'app-firstpage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
   AlertComponent,
  ],
  templateUrl: './firstpage.component.html',
})
export class FirstpageComponent {
  private readonly authService  = inject(AuthService);
  private readonly alertService = inject(AlertService);
  private readonly loginService = inject(LoginService);
  private readonly http         = inject(HttpClient);

  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());
  readonly account         = computed(() => this.authService.account());

  // ── Contact ────────────────────────────────────────────────────────────────

  contact: ContactForm = this._emptyContact();
  captchaContact       = '';

  readonly contactSuccess  = signal(false);
  readonly contactError    = signal(false);
  readonly captchaBuster   = signal(Math.random());

  get captchaContactUrl(): string {
    return `captcha/contact?cacheBuster=${this.captchaBuster()}`;
  }

  refreshContactCaptcha(): void {
    this.captchaBuster.set(Math.random());
    this.captchaContact = '';
  }

  contactUs(): void {
    this.contactError.set(false);

    if (!this.captchaContact) {
      this.contactError.set(true);
      this.alertService.error("Résoudre Tout d'abord le Captcha de verification !");
      return;
    }

    this.loginService.checkCaptcha(this.captchaContact, 'contact').subscribe({
      next: (res: CaptchaResult) => {
        if (!res.res) {
          this.contactError.set(true);
          this.alertService.error(res.status);
          if (res.expired) this.refreshContactCaptcha();
          this.captchaContact = '';
        } else {
          this._doSendContact();
        }
      },
      error: (err) => {
        this.contactError.set(true);
        this.alertService.error(err?.message ?? 'Erreur captcha');
        this.refreshContactCaptcha();
        this.captchaContact = '';
      },
    });
  }

  // ── Recherche facture (SearchServiceController) ────────────────────────────

  search: InvoiceSearch = { matFisc: '', generatedRef: '' };
  recaptchaResponse     = '';

  readonly searchError   = signal(false);
  readonly searchMessage = signal('');

  doSearch(): void {
    this.searchError.set(false);
    this.searchMessage.set('');

    if (!this.search.generatedRef && !this.search.matFisc) {
      this.searchError.set(true);
      this.searchMessage.set('Saisir la matricule et la reference de la facture !');
      return;
    }
    if (!this.search.generatedRef) {
      this.searchError.set(true);
      this.searchMessage.set('Saisir la reference de la facture !');
      return;
    }
    if (!this.search.matFisc) {
      this.searchError.set(true);
      this.searchMessage.set('Saisir la matricule du partenaire !');
      return;
    }
    if (!this.recaptchaResponse) {
      this.searchError.set(true);
      this.searchMessage.set("Résoudre Tout d'abord le Captcha de verification !");
      return;
    }

    this.http
      .get(`api/fatoora/${this.search.generatedRef}/${this.search.matFisc}`)
      .subscribe({
        next: (res: any) => {
          if (!res || res === '') {
            this.alertService.warning(
              `Pas de facture enregistrée avec la reference ${this.search.generatedRef}`
            );
          } else {
            this.alertService.info(
              `La facture avec la reference ${this.search.generatedRef} est enregistrée avec un montant de ${res}`
            );
          }
        },
        error: (err) => {
          if (err.status === 500) {
            this.alertService.error('Service consultation non disponible, reessayez plus tard !');
          } else {
            this.alertService.error('Erreur lors de la consultation');
          }
        },
      });
  }

  // ── Téléchargements (home + firstpage partagés) ────────────────────────────

  download(document: string, name: string): void {
    this.http
      .get(`api/download/${document}`, { responseType: 'arraybuffer' })
      .subscribe({
        next: (data) => this._saveAs(data, name, 'application/octet-stream'),
        error: () => this.alertService.error('Erreur lors du téléchargement'),
      });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _doSendContact(): void {
    this.authService.sendContactEmail(this.contact as any).subscribe({
      next: () => {
        this.contactSuccess.set(true);
        this.alertService.success('Message envoyé');
        this.contact = this._emptyContact();
        this.refreshContactCaptcha();
      },
      error: (res) => {
        this.contactSuccess.set(false);
        this.contactError.set(true);
        this.refreshContactCaptcha();
        this.captchaContact = '';
        if (res.status === 400 && res.error === 'e-mail address not registered') {
          this.alertService.error("Erreur d'envoi: e-mail address non enregistré");
        } else {
          this.alertService.error("Erreur d'envoi");
        }
      },
    });
  }

  private _emptyContact(): ContactForm {
    return { name: '', email: '', socity: '', coddou: '', subject: '', message: '', tel: '', nbrInvoice: '' };
  }

  private _saveAs(data: ArrayBuffer, filename: string, mimeType: string): void {
    const blob = new Blob([data], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}
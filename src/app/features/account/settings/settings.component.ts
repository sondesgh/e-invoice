import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthService } from '@core/services/auth.service';
import { AlertErrorComponent } from '@shared/components/alert/alert-error.component';
import { Account } from '@core/models/account.model';
import { SUPPORTED_LANGUAGES } from '@core/config/translation.config';

/**
 * SettingsComponent
 *
 * Migré depuis `SettingsController` + `settings.html`.
 *
 * - `Principal.identity()` → `authService.identity()`
 * - `Auth.updateAccount()` → `authService.updateAccount()`
 * - `JhiLanguageService.getCurrent()` → `translate.currentLang`
 * - Le sélecteur de langue utilise `SUPPORTED_LANGUAGES` (fr, ar, en)
 *
 * Authorities : ROLE_USER, ROLE_SUPER_USER, ROLE_ADMIN, ROLE_SUPPORT
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    AlertErrorComponent,
  ],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly translate   = inject(TranslateService);

  settingsAccount: Partial<Account> = {};
  languages = SUPPORTED_LANGUAGES;   // ['fr', 'ar', 'en']

  readonly success = signal(false);
  readonly error   = signal(false);

  ngOnInit(): void {
    this.authService.identity().then((account) => {
      if (account) this.settingsAccount = this._copyAccount(account);
    });
  }

  save(): void {
    this.authService.updateAccount(this.settingsAccount as Account).subscribe({
      next: () => {
        this.error.set(false);
        this.success.set(true);

        // Rafraîchit l'identité en cache
        this.authService.identity(true).then((account) => {
          if (account) this.settingsAccount = this._copyAccount(account);
        });

        // Change la langue si nécessaire (miroir de JhiLanguageService)
        const selected = this.settingsAccount.langKey;
        if (selected && selected !== this.translate.currentLang) {
          this.translate.use(selected);
        }
      },
      error: () => {
        this.success.set(false);
        this.error.set(true);
      },
    });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _copyAccount(account: Account): Partial<Account> {
    return {
      activated:  account.activated,
      email:      account.email,
      firstName:  account.firstName,
      langKey:    account.langKey,
      lastName:   account.lastName,
      login:      account.login,
    };
  }
}

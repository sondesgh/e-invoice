import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '@core/services/auth.service';
import { AlertErrorComponent } from '@shared/components/alert/alert-error.component';
import { PasswordStrengthBarComponent } from '@features/account/password/password-strength-bar.component';
import { Account } from '@core/models/account.model';

/**
 * PasswordComponent
 *
 * Migré depuis `PasswordController` + `password.html`.
 *
 * Authorities : ROLE_USER, ROLE_SUPER_USER, ROLE_ADMIN, ROLE_SUPPORT
 * `Auth.changePassword(vm.password)` → `authService.changePassword({ newPassword })`
 */
@Component({
  selector: 'app-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
   // AlertErrorComponent,
    PasswordStrengthBarComponent,
  ],
  templateUrl: './password.component.html',
})
export class PasswordComponent implements OnInit {
  private readonly authService = inject(AuthService);

  account: Account | null = null;

  newPassword     = '';
  confirmPassword = '';

  readonly success    = signal(false);
  readonly error      = signal(false);
  readonly doNotMatch = signal(false);

  ngOnInit(): void {
    this.authService.identity().then((account) => (this.account = account));
  }

  changePassword(): void {
    if (this.newPassword !== this.confirmPassword) {
      this.error.set(false);
      this.success.set(false);
      this.doNotMatch.set(true);
      return;
    }

    this.doNotMatch.set(false);
    this.authService
      .changePassword({ newPassword: this.newPassword } as any)
      .subscribe({
        next: ()  => { this.error.set(false);   this.success.set(true); },
        error: () => { this.success.set(false);  this.error.set(true); },
      });
  }
}

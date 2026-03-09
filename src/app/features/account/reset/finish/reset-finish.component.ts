import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '../../../../core/services/auth.service';
import { PasswordStrengthBarComponent } from '../../password/password-strength-bar.component';

/**
 * ResetFinishComponent
 *
 * Migré depuis `ResetFinishController` + `reset.finish.html`.
 *
 * - `$stateParams.key`          → `ActivatedRoute.snapshot.queryParamMap.get('key')`
 * - `angular.isUndefined(key)`  → `!key`
 * - `Auth.resetPasswordFinish()` → `authService.resetPasswordFinish()`
 * - `LoginService.open`          → `[routerLink]="/login"` (fin des modals)
 * - `$timeout(() => focus())`    → `autofocus` natif HTML
 *
 * Route : /reset/finish?key   (authorities: [])
 */
@Component({
  selector: 'app-reset-finish',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    PasswordStrengthBarComponent,
  ],
  templateUrl: './reset-finish.component.html',
})
export class ResetFinishComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route       = inject(ActivatedRoute);

  private key = '';

  newPassword     = '';
  confirmPassword = '';

  readonly keyMissing = signal(false);
  readonly success    = signal(false);
  readonly error      = signal(false);
  readonly doNotMatch = signal(false);

  ngOnInit(): void {
    const k = this.route.snapshot.queryParamMap.get('key');
    this.keyMissing.set(!k);
    this.key = k ?? '';
  }

  finishReset(): void {
    this.doNotMatch.set(false);
    this.error.set(false);

    if (this.newPassword !== this.confirmPassword) {
      this.doNotMatch.set(true);
      return;
    }

    this.authService
      .resetPasswordFinish({ key: this.key, newPassword: this.newPassword })
      .subscribe({
        next: ()  => this.success.set(true),
        error: () => { this.success.set(false); this.error.set(true); },
      });
  }
}

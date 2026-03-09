import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * PasswordStrengthBarComponent
 *
 * Migré depuis `password-strength-bar.directive.js`.
 * Logique de calcul de force identique au legacy (mêmes seuils, mêmes couleurs).
 *
 * Usage :
 * ```html
 * <app-password-strength-bar [passwordToCheck]="password" />
 * ```
 */
@Component({
  selector: 'app-password-strength-bar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div id="strength" [class.ng-hide]="!passwordToCheck">
      <small translate="global.messages.validate.newpassword.strength">
        Password strength:
      </small>
      <ul id="strengthBar" style="display:inline-flex; gap:4px; list-style:none; padding:0; margin:0 0 0 8px;">
        @for (point of points; track $index) {
          <li class="point"
              style="width:18px; height:10px; border-radius:3px;"
              [style.background-color]="point">
          </li>
        }
      </ul>
    </div>
  `,
})
export class PasswordStrengthBarComponent implements OnChanges {
  @Input() passwordToCheck = '';

  /** 5 segments — couleur calculée selon la force. */
  points: string[] = ['#DDD', '#DDD', '#DDD', '#DDD', '#DDD'];

  private readonly COLORS = ['#F00', '#F90', '#FF0', '#9F0', '#0F0'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['passwordToCheck']) {
      this._update(this.passwordToCheck ?? '');
    }
  }

  // ── Private — logique identique au legacy ──────────────────────────────────

  private _measureStrength(p: string): number {
    if (!p) return 0;

    const hasLower   = /[a-z]+/.test(p);
    const hasUpper   = /[A-Z]+/.test(p);
    const hasNumbers = /[0-9]+/.test(p);
    const hasSymbols = /[$-/:-?{-~!"^_`[\]]/g.test(p);

    const flags   = [hasLower, hasUpper, hasNumbers, hasSymbols];
    const matches = flags.filter(Boolean).length;

    let force = 2 * p.length + (p.length >= 10 ? 1 : 0);
    force += matches * 10;

    // Pénalités (miroir exact du legacy)
    if (p.length <= 6)    force = Math.min(force, 10);
    if (matches === 1)    force = Math.min(force, 10);
    if (matches === 2)    force = Math.min(force, 20);
    if (matches === 3)    force = Math.min(force, 40);

    return force;
  }

  private _getColorIndex(score: number): number {
    if (score <= 10) return 0;
    if (score <= 20) return 1;
    if (score <= 30) return 2;
    if (score <= 40) return 3;
    return 4;
  }

  private _update(password: string): void {
    const filled = password
      ? this._getColorIndex(this._measureStrength(password)) + 1
      : 0;
    const color = password ? this.COLORS[filled - 1] : '#DDD';

    this.points = Array.from({ length: 5 }, (_, i) =>
      i < filled ? color : '#DDD'
    );
  }
}

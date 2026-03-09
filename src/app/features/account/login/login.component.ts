import {
  Component, signal, inject, OnInit, OnDestroy,
  AfterViewInit, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule }            from '@angular/common';
import { FormsModule }             from '@angular/forms';
import { Router, RouterModule }    from '@angular/router';
import { TranslateModule }         from '@ngx-translate/core';

import { AuthService }                      from '../../../core/services/auth.service';
import { LoginService, CaptchaResult }      from './login.service';
import { RecaptchaService }                 from './recaptcha.service';
import { Account }                          from '../../../core/models/account.model';
import { LoginCardDialogComponent }         from './login-card-dialog.component';

/**
 * LoginComponent — Angular 19 standalone
 *
 * Migration depuis LoginController (AngularJS) + vcRecaptcha
 *
 * Deux captchas coexistent (identique au legacy) :
 *  1. Captcha image maison  → GET captcha/checkCaptchaGen  (CaptchaController.java)
 *     Obligatoire pour toute connexion.
 *
 *  2. Google reCAPTCHA v2   → POST recaptcha/verifyUser    (RecaptchaManagementController.java)
 *     Affiché en complément (configurable via `useGoogleRecaptcha`).
 *     Remplace vcRecaptcha / ng-recaptcha — script chargé dynamiquement par RecaptchaService.
 *
 * Flux :
 *  captcha image OK → (reCAPTCHA OK si activé) → Auth.login() → identity()
 *  → ROLE_SUPER_USER : logout + ouvre LoginCardDialog
 *  → autres rôles   : navigate previousState || /home
 */
@Component({
  selector:    'app-login',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterModule, TranslateModule, LoginCardDialogComponent],
  templateUrl: './login.component.html',
  styleUrls:   ['./login.component.scss'],
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── Injections ────────────────────────────────────────────────────────────
  private readonly authService      = inject(AuthService);
  private readonly loginService     = inject(LoginService);
  private readonly router           = inject(Router);
  readonly         recaptchaService = inject(RecaptchaService);

  // ── Références DOM ────────────────────────────────────────────────────────
  @ViewChild('recaptchaContainer') recaptchaContainer!: ElementRef<HTMLDivElement>;

  // ── Config ────────────────────────────────────────────────────────────────
  /**
   * Mettre à `true` pour activer le widget Google reCAPTCHA v2 en plus
   * du captcha image. Correspond à l'ancien `vmm.key` dans le controller.
   * Peut être piloté par une variable d'environnement Angular si souhaité.
   */
  readonly useGoogleRecaptcha = false;

  // ── Form state ─────────────────────────────────────────────────────────────
  username   = '';
  password   = '';
  rememberMe = false;
  captcha    = '';               // captcha image maison

  // ── UI state ───────────────────────────────────────────────────────────────
  readonly isLoading            = signal(false);
  readonly authenticationError  = signal(false);
  readonly errorMessage         = signal('');
  readonly showCardDialog       = signal(false);

  cardCredentials: { username: string; password: string; rememberMe: boolean } | null = null;

  // ── Captcha image ──────────────────────────────────────────────────────────
  readonly captchaBuster = signal(Math.random());

  get captchaUrl(): string {
    return `captcha?cacheBuster=${this.captchaBuster()}`;
  }

  refreshCaptcha(): void {
    this.captchaBuster.set(Math.random());
    this.captcha = '';
  }

  // ── reCAPTCHA v2 (Google) ─────────────────────────────────────────────────
  private _recaptchaWidgetId: number | null = null;
  private _recaptchaToken = '';

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void { /* rien ici — DOM pas encore prêt */ }

  ngAfterViewInit(): void {
    if (this.useGoogleRecaptcha && this.recaptchaContainer) {
      this.recaptchaService.render(
        this.recaptchaContainer.nativeElement,
        (token: string) => { this._recaptchaToken = token; },
        ()              => { this._recaptchaToken = ''; }
      ).then(id => { this._recaptchaWidgetId = id; });
    }
  }

  ngOnDestroy(): void {
    // Le widget grecaptcha n'a pas de destroy officiel — le DOM est nettoyé par Angular
    this._recaptchaWidgetId = null;
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  login(): void {
    // 1. Validation captcha image (obligatoire)
    if (!this.captcha.trim()) {
      this.authenticationError.set(true);
      this.errorMessage.set("Résoudre Tout d'abord le Captcha de verification !");
      return;
    }

    // 2. Validation reCAPTCHA Google (si activé)
    if (this.useGoogleRecaptcha && !this._recaptchaToken) {
      this.authenticationError.set(true);
      this.errorMessage.set('Veuillez cocher le reCAPTCHA Google.');
      return;
    }

    this.isLoading.set(true);
    this.authenticationError.set(false);

    // 3. Vérification captcha image côté serveur (CaptchaController.java)
    this.loginService.checkCaptcha(this.captcha, 'login').subscribe({
      next: (res: CaptchaResult) => {
        if (!res.res) {
          this.authenticationError.set(true);
          this.errorMessage.set(res.status);
          if (res.expired) this.refreshCaptcha();
          this.captcha = '';
          this._resetRecaptcha();
          this.isLoading.set(false);
        } else {
          // 4. Vérification reCAPTCHA Google (si activé)
          if (this.useGoogleRecaptcha && this._recaptchaToken) {
            this.recaptchaService.verifyToken(this._recaptchaToken).subscribe({
              next:  (ok) => ok ? this._doLogin() : this._onRecaptchaFail(),
              error: ()   => this._onRecaptchaFail(),
            });
          } else {
            this._doLogin();
          }
        }
      },
      error: (err) => {
        this.authenticationError.set(false);
        this.errorMessage.set(err?.message ?? 'Erreur captcha');
        this.refreshCaptcha();
        this.captcha = '';
        this._resetRecaptcha();
        this.isLoading.set(false);
      },
    });
  }

  navigateToRegister():       void { this.router.navigate(['/register']); }
  navigateToResetPassword():  void { this.router.navigate(['/reset/request']); }

  onCardSuccess(): void { this.showCardDialog.set(false); this._navigateAfterLogin(); }
  onCardCancel():  void { this.showCardDialog.set(false); this.authService.logout().subscribe(); }

  // ── Private ────────────────────────────────────────────────────────────────

  private _doLogin(): void {
    this.authService
      .login({ username: this.username, password: this.password, rememberMe: this.rememberMe })
      .subscribe({
        next: (account: Account | null) => {
          this.isLoading.set(false);
          this.authenticationError.set(false);
          this.errorMessage.set('');

          const isSuperUser = account?.authorities?.includes('ROLE_SUPER_USER') ?? false;

          if (isSuperUser) {
            // Authentification complémentaire par carte (LoginCardController legacy)
            this.authService.authenticate(null);
            this.authService.logout().subscribe();
            this.cardCredentials = {
              username:   this.username,
              password:   this.password,
              rememberMe: this.rememberMe,
            };
            this.showCardDialog.set(true);
          } else {
            this._navigateAfterLogin();
          }
        },
        error: (res) => {
          this.isLoading.set(false);
          this.password = '';
          this.authenticationError.set(true);
          this.errorMessage.set(res?.error?.message ?? 'Échec de connexion');
          this.refreshCaptcha();
          this.captcha = '';
          this._resetRecaptcha();
        },
      });
  }

  private _navigateAfterLogin(): void {
    const previous = this.authService.getPreviousState();
    if (previous) {
      this.authService.resetPreviousState();
      const dest = previous.name === '/' ? '/home' : previous.name;
      this.router.navigateByUrl(dest);
    } else {
      this.router.navigate(['/home']);
    }
  }

  private _onRecaptchaFail(): void {
    this.authenticationError.set(true);
    this.errorMessage.set('Échec de vérification reCAPTCHA, réessayez.');
    this._resetRecaptcha();
    this.isLoading.set(false);
  }

  private _resetRecaptcha(): void {
    if (this.useGoogleRecaptcha && this._recaptchaWidgetId !== null) {
      this.recaptchaService.reset(this._recaptchaWidgetId);
    }
    this._recaptchaToken = '';
  }
}

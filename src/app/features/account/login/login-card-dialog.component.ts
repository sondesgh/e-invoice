import {
  Component, Input, Output, EventEmitter, signal, inject
} from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient }      from '@angular/common/http';

import { AuthService }                    from '../../../core/services/auth.service';
import { LoginService, SignatoryResult }  from './login.service';

export interface CardCredentials {
  username:   string;
  password:   string;
  rememberMe: boolean;
}

/**
 * LoginCardDialogComponent — Angular 19 standalone
 *
 * Migré depuis LoginCardController + login.card.html (AngularJS).
 * Remplace $uibModal.open() par un composant inline conditionnel.
 *
 * Corrections vs version précédente :
 *  ✓ HttpClient injecté directement (supprime this.authService['http'])
 *  ✓ import() dynamique dead-code supprimé
 *  ✓ Conflit cancel @Output / méthode template résolu → méthode renommée onCancel()
 *
 * Flux :
 *  GET api/localSign/getCertificat?store=true&connect=true
 *    → result[0] === 'success' → getSignatory(email, serial, username)
 *      → res.data === true → Auth.login() → emit success
 *      → res.data === false → erreur signataire
 *    → result[0] !== 'success' → erreur certificat
 */
@Component({
  selector:   'app-login-card-dialog',
  standalone:  true,
  imports:    [CommonModule, FormsModule, TranslateModule],
  templateUrl: './login-card-dialog.component.html',
  styleUrls:  ['./login-card-dialog.component.scss'],
})
export class LoginCardDialogComponent {

  @Input({ required: true }) credentials!: CardCredentials;

  /** Émis après connexion carte réussie. */
  @Output() success = new EventEmitter<void>();

  /**
   * Émis quand l'utilisateur ferme le dialog.
   * NB : le nom de l'@Output est `cancel` (attendu par LoginComponent),
   * mais la méthode appelée dans le template est `onCancel()` pour éviter
   * le conflit Angular entre l'EventEmitter et un appel de méthode homonyme.
   */
  @Output() cancel = new EventEmitter<void>();

  // ── Injections ────────────────────────────────────────────────────────────
  // HttpClient injecté ici directement — évite this.authService['http'] (anti-pattern)
  private readonly http         = inject(HttpClient);
  private readonly authService  = inject(AuthService);
  private readonly loginService = inject(LoginService);

  // ── État UI ───────────────────────────────────────────────────────────────
  readonly isLoading           = signal(false);
  readonly authenticationError = signal(false);
  readonly errorMessage        = signal('');

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Ferme le dialog — appelle l'@Output `cancel`. */
  onCancel(): void {
    this.cancel.emit();
  }

  /** Lance l'authentification par certificat carte. */
  signByCard(): void {
    this.isLoading.set(true);
    this.authenticationError.set(false);
    this.errorMessage.set('');

    // Étape 1 : lecture du certificat via le service de signature local
    // Miroir de SignService.getCertificat(store=true, connect=true)
    this.http
      .get<string[]>('api/localSign/getCertificat', {
        params: { store: 'true', connect: 'true' },
      })
      .subscribe({
        next:  (result) => this._onCertificatResult(result),
        error: ()       => {
          this.isLoading.set(false);
          this.authenticationError.set(true);
          this.errorMessage.set(
            'Erreur de connexion au service de signature local : vérifier que le service est bien installé et fonctionnel.'
          );
        },
      });
  }

  // ── Étapes privées ────────────────────────────────────────────────────────

  private _onCertificatResult(result: string[]): void {
    if (result[0] !== 'success') {
      this.isLoading.set(false);
      this.authenticationError.set(true);
      this.errorMessage.set(result[1] ?? 'Erreur lecture certificat.');
      return;
    }

    const serialNumber = result[1];
    const email        = result[3];

    // Étape 2 : vérification du signataire
    this.loginService
      .getSignatory(email, serialNumber, this.credentials.username)
      .subscribe({
        next:  (res) => this._onSignatoryResult(res),
        error: ()    => {
          this.isLoading.set(false);
          this.authenticationError.set(true);
          this.errorMessage.set('Erreur lors de la vérification du signataire.');
        },
      });
  }

  private _onSignatoryResult(res: SignatoryResult): void {
    if (!res?.data) {
      this.isLoading.set(false);
      this.authenticationError.set(true);
      this.errorMessage.set('Pas de signataire enregistré pour votre certificat.');
      return;
    }

    // Étape 3 : connexion finale
    this.authService
      .login({
        username:   this.credentials.username,
        password:   this.credentials.password,
        rememberMe: this.credentials.rememberMe,
      })
      .subscribe({
        next:  () => {
          this.isLoading.set(false);
          this.success.emit();
        },
        error: () => {
          this.isLoading.set(false);
          this.authenticationError.set(true);
          this.errorMessage.set('Échec de connexion.');
        },
      });
  }
}

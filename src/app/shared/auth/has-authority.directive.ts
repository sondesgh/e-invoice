import {
  Directive,
  Input,
  OnInit,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
  untracked,
} from '@angular/core';
import { from, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

/**
 * HasAuthorityDirective
 *
 * Port de l'AngularJS `has-authority` directive (has-authority.directive.js).
 *
 * Vérifie qu'un utilisateur possède **exactement** un rôle donné.
 * Contrairement à `HasAnyAuthorityDirective`, ce check est asynchrone car
 * il appelle `AuthService.hasAuthority()` qui attend la résolution de l'identité
 * (mirrors `Principal.hasAuthority()` → promise dans le legacy).
 *
 * ### Structural usage (préféré)
 * ```html
 * <button *appHasAuthority="'ROLE_ADMIN'">Admin only</button>
 * ```
 *
 * ### Attribute usage (mirrors legacy `has-authority="ROLE_ADMIN"`)
 * ```html
 * <button appHasAuthority="ROLE_ADMIN">Admin only</button>
 * ```
 *
 * Différence avec `HasAnyAuthorityDirective` :
 *  - Accepte un seul rôle (string)
 *  - Le check passe par la résolution complète de l'identité (identityPromise)
 *    avant d'afficher/masquer l'élément, ce qui garantit que les droits sont
 *    exacts même après un rechargement de page.
 */
@Directive({
  selector: '[appHasAuthority]',
  standalone: true,
})
export class HasAuthorityDirective implements OnInit, OnDestroy {
  private readonly authService   = inject(AuthService);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly templateRef   = inject(TemplateRef<unknown>, { optional: true });

  private _authority = '';
  private _hasView   = false;
  private _sub?: Subscription;

  @Input()
  set appHasAuthority(value: string) {
    this._authority = value.trim();
    this._check();
  }

  ngOnInit(): void {
    // Re-évaluer à chaque changement d'identité (signal effect).
    effect(() => {
      void this.authService.account(); // enregistre la dépendance réactive
      untracked(() => this._check());
    });
  }

  ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * Lance le check asynchrone d'autorité.
   * Miroir de `Principal.hasAuthority(authority).then(result => ...)`.
   */
  private _check(): void {
    if (!this._authority) return;

    // Annule le check précédent si toujours en cours
    this._sub?.unsubscribe();

    this._sub = from(this.authService.identity()).pipe(
      switchMap(async () => this.authService.hasAuthority(this._authority))
    ).subscribe((result) => {
      this._updateVisibility(result);
    });
  }

  private _updateVisibility(visible: boolean): void {
    if (this.templateRef) {
      // Mode structurel : *appHasAuthority
      if (visible && !this._hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this._hasView = true;
      } else if (!visible && this._hasView) {
        this.viewContainer.clear();
        this._hasView = false;
      }
    } else {
      // Mode attribut : toggle class `hidden`
      const el = this.viewContainer.element.nativeElement as HTMLElement;
      if (el?.classList) {
        visible ? el.classList.remove('hidden') : el.classList.add('hidden');
      }
    }
  }
}

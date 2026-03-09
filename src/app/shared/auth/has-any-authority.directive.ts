import {
  Directive,
  Input,

  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
} from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

/**
 * HasAnyAuthorityDirective
 *
 * Structural directive — shows the host element only when the current user
 * holds at least one of the specified roles.
 *
 * Migrated from AngularJS `has-any-authority` directive.
 * Works both as a **structural** directive (preferred) and as an
 * **attribute** directive on any element.
 *
 * ### Structural usage (preferred)
 * ```html
 * <button *appHasAnyAuthority="'ROLE_ADMIN,ROLE_SUPPORT'">Delete all</button>
 * ```
 *
 * ### Attribute usage (mirrors legacy `has-any-authority="..."`)
 * ```html
 * <button appHasAnyAuthority="ROLE_ADMIN,ROLE_SUPPORT">Delete all</button>
 * ```
 */
@Directive({
  selector: '[appHasAnyAuthority]',
  standalone: true,
})
export class HasAnyAuthorityDirective  {
  private readonly authService  = inject(AuthService);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly templateRef   = inject(TemplateRef<unknown>, { optional: true });

  private _authorities: string[] = [];
  private _hasView = false;

  @Input()
  set appHasAnyAuthority(value: string | string[]) {
    this._authorities =
      typeof value === 'string'
        ? value.replace(/\s+/g, '').split(',').filter(Boolean)
        : value;

    this._updateVisibility();
  }

  constructor() {
    effect(() => {
      void this.authService.account();
      this._updateVisibility();
    });
  }
  // ── Private ─────────────────────────────────────────────────────────────────

  private _updateVisibility(): void {
    const hasAuthority = this.authService.hasAnyAuthority(this._authorities);

    if (this.templateRef) {
      // Structural usage: *appHasAnyAuthority
      if (hasAuthority && !this._hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this._hasView = true;
      } else if (!hasAuthority && this._hasView) {
        this.viewContainer.clear();
        this._hasView = false;
      }
    } else {
      // Attribute usage: toggle hidden class on the host element
      const el = this.viewContainer.element.nativeElement as HTMLElement;
      if (el?.classList) {
        hasAuthority ? el.classList.remove('hidden') : el.classList.add('hidden');
      }
    }
  }
}
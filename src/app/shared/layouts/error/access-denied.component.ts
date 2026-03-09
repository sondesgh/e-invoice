import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth.service';

/**
 * AccessDeniedComponent — page 403 / non authentifié.
 *
 * Migrée depuis `app/layouts/error/accessdenied.html` + `error.state.js`.
 *
 * Deux cas d'usage (miroir du legacy `authExpiredInterceptor`) :
 *  - Utilisateur non connecté  → bouton "Se connecter" + rappel de la route précédente
 *  - Utilisateur connecté mais sans le rôle requis → message 403 seul
 *
 * Route : /accessdenied   (authorities: [])
 */
@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  template: `
    <div class="wrapper1">
      <br /><br />

      <section class="bg-transparent">
        <div class="invoicewell">
          <div class="col-md-8">

            <h1 translate="error.title">Error Page!</h1>

            <!-- 403 : connecté mais pas autorisé -->
            @if (isAuthenticated) {
              <div class="alert alert-danger" translate="error.403">
                You are not authorized to access the page.
              </div>
            }

            <!-- 401 : non authentifié -->
            @if (!isAuthenticated) {
              <div class="alert alert-warning">
                Vous devez être connecté pour accéder à cette page.
              </div>
              <a [routerLink]="['/login']" class="btn btn-primary">
                <span class="glyphicon glyphicon-log-in"></span>&nbsp;Se connecter
              </a>
            }

            <a [routerLink]="['/home']" class="btn btn-default" style="margin-left:8px">
              <span class="glyphicon glyphicon-home"></span>&nbsp;Accueil
            </a>

          </div>
        </div>
      </section>
    </div>
  `,
})
export class AccessDeniedComponent {
  readonly isAuthenticated: boolean;

  constructor() {
    this.isAuthenticated = inject(AuthService).isAuthenticated();
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationExtras } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

/**
 * ErrorComponent — page d'erreur générique.
 *
 * Migrée depuis `app/layouts/error/error.html` + `error.state.js`.
 *
 * Le message optionnel est transmis via `router.navigate(['/error'], { state: { message, status } })`.
 * Corresponds aux redirections faites par `error-handler.interceptor.ts`.
 *
 * Route : /error   (authorities: [])
 */
@Component({
  selector: 'app-error',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  template: `
    <div class="wrapper1">
      <br /><br />

      <section class="bg-transparent" id="home">
        <div class="row">
          <br />
          <div class="col-md-12">
            <h1 translate="error.title">Error Page!</h1>

            @if (errorMessage) {
              <div class="alert alert-danger">
                {{ errorMessage }}
              </div>
            }

            @if (errorStatus) {
              <div class="alert alert-warning">
                HTTP {{ errorStatus }}
              </div>
            }

            <a [routerLink]="['/home']" class="btn btn-primary">
              <span class="glyphicon glyphicon-home"></span>
              &nbsp;Retour à l'accueil
            </a>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class ErrorComponent {
  /** Message passé via router state ou navigation extras. */
  errorMessage: string | null = null;
  errorStatus: number | null = null;

  constructor() {
    const nav = inject(Router).getCurrentNavigation();
    const state = nav?.extras?.state as { message?: string; status?: number } | undefined;
    this.errorMessage = state?.message ?? null;
    this.errorStatus  = state?.status  ?? null;
  }
}

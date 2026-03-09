import { Routes } from '@angular/router';

/**
 * Routes des layouts d'erreur.
 *
 * Migrées depuis `error.state.js` (états `error` et `accessdenied`).
 * Les deux routes sont publiques (authorities: []).
 * La redirection vers ces routes est déclenchée par `error-handler.interceptor.ts`.
 *
 * À importer dans `app.routes.ts` :
 * ```ts
 * import { ERROR_ROUTES } from './layouts/error/error.routes';
 * ...
 * { path: '', children: ERROR_ROUTES }
 * ```
 */
export const ERROR_LAYOUT_ROUTES: Routes = [
  {
    path: 'error',
    loadComponent: () =>
      import('./error.component').then((m) => m.ErrorComponent),
    data: { pageTitle: 'error.title' },
  },
  {
    path: 'accessdenied',
    loadComponent: () =>
      import('./access-denied.component').then((m) => m.AccessDeniedComponent),
    data: { pageTitle: 'error.title' },
  },
];

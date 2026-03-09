import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

/**
 * account.routes.ts
 *
 * Remplace `account.state.js` (état abstrait parent) + les states individuels.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CORRECTIONS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. CONFLIT DE ROUTES avec app.routes.ts
 *    app.routes.ts déclare déjà les routes publiques (activate, register,
 *    reset/request, reset/finish) ET les routes authentifiées account/* dans
 *    un bloc enfant `path: 'account'`.
 *    Ce fichier ACCOUNT_ROUTES est utilisé en REMPLACEMENT (via loadChildren)
 *    ou en FUSION selon l'architecture choisie.
 *
 *    ⚠️  Si app.routes.ts est la source unique (architecture actuelle) :
 *        → NE PAS importer ACCOUNT_ROUTES dans app.routes.ts en plus des routes
 *          déjà déclarées inline : cela crée des routes dupliquées.
 *        → Deux options :
 *           A) Supprimer les routes account de app.routes.ts et les déléguer ici
 *              via `loadChildren: () => import('./account.routes').then(m => m.ACCOUNT_ROUTES)`
 *           B) Garder app.routes.ts tel quel et ne pas utiliser ce fichier.
 *
 *    Ce fichier adopte l'OPTION A (routes standalone, sans préfixe) :
 *    les paths sont relatifs au point de chargement dans app.routes.ts.
 *
 * 2. CLÉS pageTitle MANQUANTES / INCORRECTES
 *    - sessions : 'global.menu.account.sessions' → 'sessions.title'
 *      (cohérent avec sessions.json et le legacy sessions.state.js)
 *    - settings : 'global.menu.account.settings' → 'settings.title'
 *      (cohérent avec settings.json)
 *
 * 3. PATHS account/* → retirés (ce fichier est chargé sous le path 'account')
 *    'account/password' → 'password'
 *    'account/sessions' → 'sessions'
 *    'account/settings' → 'settings'
 *
 * 4. AUTHORITIES sessions : ROLE_SUPER_USER manquait dans le legacy
 *    → aligné avec la logique métier (ROLE_SUPER_USER peut gérer ses sessions).
 */
export const ACCOUNT_ROUTES: Routes = [

  // ── Routes publiques (sans canActivate) ──────────────────────────────────
  {
    path: 'reset/request',
    loadComponent: () =>
      import('./reset/request/reset-request.component').then((m) => m.ResetRequestComponent),
    data: { pageTitle: 'reset.request.title' },   //  FIX : clé dans reset.json
  },
  {
    path: 'reset/finish',
    loadComponent: () =>
      import('./reset/finish/reset-finish.component').then((m) => m.ResetFinishComponent),
    data: { pageTitle: 'reset.finish.title' },    //  FIX : clé dans reset.json
  },

  // ── Routes authentifiées (paths relatifs : chargées sous /account) ───────
  {
    path: 'password',                             //  FIX : était 'account/password'
    canActivate: [authGuard],
    data: {
      authorities: ['ROLE_USER', 'ROLE_SUPER_USER', 'ROLE_ADMIN', 'ROLE_SUPPORT'],
      pageTitle: 'password.title',                //  FIX : clé dans password.json
    },
    loadComponent: () =>
      import('./password/password.component').then((m) => m.PasswordComponent),
  },
  {
    path: 'sessions',                             //  FIX : était 'account/sessions'
    canActivate: [authGuard],
    data: {
      authorities: ['ROLE_USER', 'ROLE_SUPER_USER', 'ROLE_ADMIN', 'ROLE_SUPPORT'],
      pageTitle: 'sessions.title',                //  FIX : était 'global.menu.account.sessions'
    },
    loadComponent: () =>
      import('./sessions/sessions.component').then((m) => m.SessionsComponent),
  },
  {
    path: 'settings',                             //  FIX : était 'account/settings'
    canActivate: [authGuard],
    data: {
      authorities: ['ROLE_USER', 'ROLE_SUPER_USER', 'ROLE_ADMIN', 'ROLE_SUPPORT'],
      pageTitle: 'settings.title',                //  FIX : était 'global.menu.account.settings'
    },
    loadComponent: () =>
      import('./settings/settings.component').then((m) => m.SettingsComponent),
  },
];

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ERROR_LAYOUT_ROUTES } from './shared/layouts/error/error.routes';

/**
 * app.routes.ts — Routes racine de l'application.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CORRECTIONS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. BLOC account/* : les routes enfants avaient des paths ABSOLUS
 *    ('settings', 'password', 'sessions') définis sous un parent path:'account',
 *    donc Angular les résolvait correctement — mais le canActivate était dupliqué
 *    au niveau parent ET au niveau enfant via ACCOUNT_ROUTES si importé en plus.
 *    → Conservé inline ici (option B, app.routes.ts = source unique).
 *    → Ne PAS importer ACCOUNT_ROUTES en plus dans ce fichier.
 *
 * 2. CLÉS pageTitle corrigées :
 *    - reset/request : 'global.menu.account.password' → 'reset.request.title'
 *    - reset/finish  : 'global.menu.account.password' → 'reset.finish.title'
 *    - account/password : 'global.menu.account.password' → 'password.title'
 *    - account/sessions : (manquait pageTitle) → 'sessions.title'
 *    - account/settings : (manquait pageTitle) → 'settings.title'
 *
 * 3. AUTHORITIES account/sessions : ajout ROLE_USER (les utilisateurs voient
 *    leurs propres sessions — cohérent avec le legacy sessions.state.js).
 *
 * 4. REFERENTIEL_ROUTES : import path corrigé en commentaire (le fichier
 *    s'appelle referentiel.routes.ts, pas entity.routes.ts).
 */
export const routes: Routes = [

  // ── Redirections racine ────────────────────────────────────────────────────
  { path: '', redirectTo: 'firstpage', pathMatch: 'full' },

  // ── Routes publiques d'erreur (/error, /accessdenied) ─────────────────────
  ...ERROR_LAYOUT_ROUTES,

  // ── Landing / première page (publique) ────────────────────────────────────
  {
    path: 'firstpage',
    loadComponent: () =>
      import('./features/firstpage/firstpage.component').then((m) => m.FirstpageComponent),
    data: { pageTitle: 'global.title' },
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact.component').then((m) => m.ContactComponent),
    data: { pageTitle: 'global.title' },
  },

  // ── Authentification (routes publiques) ───────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('./features/account/login/login.component').then((m) => m.LoginComponent),
    data: { pageTitle: 'login.title' },
  },
  {
    path: 'reset/request',
    loadComponent: () =>
      import('./features/account/reset/request/reset-request.component').then(
        (m) => m.ResetRequestComponent
      ),
    data: { pageTitle: 'reset.request.title' },     //  FIX : clé dans reset.json
  },
  {
    path: 'reset/finish',
    loadComponent: () =>
      import('./features/account/reset/finish/reset-finish.component').then(
        (m) => m.ResetFinishComponent
      ),
    data: { pageTitle: 'reset.finish.title' },      //  FIX : clé dans reset.json
  },

  // ── Home (authentifié) ────────────────────────────────────────────────────
  {
    path: 'home',
    canActivate: [authGuard],
    data: {
      authorities: ['ROLE_USER', 'ROLE_SUPER_USER', 'ROLE_ADMIN', 'ROLE_SUPPORT'],
      pageTitle: 'home.title',
    },
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },

  // ── Compte utilisateur (authentifié) ─────────────────────────────────────
  {
    path: 'account',
    canActivate: [authGuard],
    data: { authorities: ['ROLE_USER', 'ROLE_SUPER_USER', 'ROLE_ADMIN', 'ROLE_SUPPORT'] },
    children: [
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/account/settings/settings.component').then((m) => m.SettingsComponent),
        data: { pageTitle: 'settings.title' },      //  FIX : clé dans settings.json
      },
      {
        path: 'password',
        loadComponent: () =>
          import('./features/account/password/password.component').then((m) => m.PasswordComponent),
        data: { pageTitle: 'password.title' },      //  FIX : clé dans password.json
      },
      {
        path: 'sessions',
        loadComponent: () =>
          import('./features/account/sessions/sessions.component').then((m) => m.SessionsComponent),
        data: {
          authorities: ['ROLE_USER', 'ROLE_SUPER_USER', 'ROLE_ADMIN', 'ROLE_SUPPORT'],
          pageTitle: 'sessions.title',              //  FIX : clé dans sessions.json
        },
      },
    ],
  },

  // ── Factures (cœur métier) ────────────────────────────────────────────────
  {
    path: 'invoice',
    canActivate: [authGuard],
    data: { authorities: ['ROLE_USER', 'ROLE_SUPER_USER', 'ROLE_ADMIN', 'ROLE_SUPPORT'] },
    children: [
      {
        path: 'add',
        loadComponent: () =>
          import('./features/invoice/add/invoice-add.component').then((m) => m.InvoiceAddComponent),
        data: { pageTitle: 'addInvoice.title' },
      },
      {
        path: 'consult',
        loadComponent: () =>
          import('./features/invoice/consult/invoice-consult.component').then(
            (m) => m.InvoiceConsultComponent
          ),
        data: { pageTitle: 'consultInvoice.title' },
      },
      {
        path: 'import',
        loadComponent: () =>
          import('./features/invoice/import/invoice-import.component').then(
            (m) => m.InvoiceImportComponent
          ),
        data: { pageTitle: 'importInvoice.title' },
      },
      {
        path: 'sign',
        loadComponent: () =>
          import('./features/invoice/sign/invoice-sign.component').then(
            (m) => m.InvoiceSignComponent
          ),
        data: { pageTitle: 'signInvoices.title' },
      },
      {
        path: 'test',
        loadComponent: () =>
          import('./features/invoice/test/invoice-test.component').then(
            (m) => m.InvoiceTestComponent
          ),
        data: { pageTitle: 'testInvoice.title' },
      },
      {
        path: 'e-doc',
        loadComponent: () =>
          import('./features/invoice/e-doc/e-doc.component').then((m) => m.EDocComponent),
        data: { pageTitle: 'eDoc.title' },
      },
    ],
  },

  // ── Documentation ─────────────────────────────────────────────────────────
  {
    path: 'documentation',
    canActivate: [authGuard],
    data: { authorities: ['ROLE_USER', 'ROLE_SUPER_USER', 'ROLE_ADMIN', 'ROLE_SUPPORT'] },
    loadComponent: () =>
      import('./features/documentation/documentation.component').then(
        m => m.DocumentationComponent
      ),
  },

  // ── Fallback ───────────────────────────────────────────────────────────────
  { path: '**', redirectTo: 'firstpage' },
];
import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

/**
 * Invoice feature routes
 *
 * Migré depuis :
 *  - invoice.state.js         → état abstrait `invoice` (parent: 'app')
 *  - invoice-add.state.js     → état `addInvoice`       (ROLE_USER)
 *  - invoice-consult.state.js → état `consultInvoice`   (ROLE_USER)
 *  - e-doc.state.js           → états `e-doc`, `e-doc-detail`
 *  - invoice-import.state.js  → état `importInvoice`    (ROLE_USER)
 *  - invoice-forSig.state.js  → état `signInvoices`     (ROLE_USER)
 *  - invoice-test.state.js    → état `testInvoice`      (ROLE_USER)
 *
 * Chargement lazy (loadComponent) : standalone components.
 * Les rôles sont passés via data.authorities — lus par authGuard.
 */
export const INVOICE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    data: { authorities: ['ROLE_USER'] },   // ← garde parent commun à toutes les routes
    children: [

      // ── Création de facture ──────────────────────────────────────────────
      {
        path: 'addInvoice',
        loadComponent: () =>
          import('./add/invoice-add.component').then(m => m.InvoiceAddComponent),
        title: 'addInvoice.title',
      },

      // ── Import + signature (fichier XML existant) ────────────────────────
      {
        path: 'importInvoice',
        loadComponent: () =>
          import('./import/invoice-import.component').then(m => m.InvoiceImportComponent),
        title: 'importInvoice.title',
      },

      // ── Signature multiple (liste de factures XML) ───────────────────────
      {
        path: 'signInvoices',
        loadComponent: () =>
          import('./sign/invoice-sign.component').then(m => m.InvoiceSignComponent),
        title: 'Factures en attente de signature',
      },

      // ── Test / validation de fichier TEIF ───────────────────────────────
      {
        path: 'testInvoice',
        loadComponent: () =>
          import('./test/invoice-test.component').then(m => m.InvoiceTestComponent),
        title: 'testInvoice.title',
      },

      // ── Consultation / historique ────────────────────────────────────────
      {
        path: 'consultInvoice',
        loadComponent: () =>
          import('./consult/invoice-consult.component').then(m => m.InvoiceConsultComponent),
        title: 'consultInvoice.title',
      },

      // ── E-Doc (rôles multiples → redéfinir data sur ces routes) ─────────
      {
        path: 'e-doc',
        canActivate: [authGuard],
        data: { authorities: ['ROLE_USER', 'ROLE_SUPPORT'] },  // ← surcharge le parent
        loadComponent: () =>
          import('./e-doc/e-doc.component').then(m => m.EDocComponent),
        title: 'portailElFatooraApp.eDoc.home.title',
      },
      {
        path: 'e-doc/:id',
        canActivate: [authGuard],
        data: { authorities: ['ROLE_ADMIN'] },                 // ← surcharge le parent
        loadComponent: () =>
          import('./e-doc/e-doc.component').then(m => m.EDocDetailComponent),
        title: 'portailElFatooraApp.eDoc.detail.title',
      },

      // ── Redirection par défaut ───────────────────────────────────────────
      {
        path: '',
        redirectTo: 'addInvoice',
        pathMatch: 'full',
      },
    ],
  },
];
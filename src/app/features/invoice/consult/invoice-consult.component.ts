import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { formatDate } from '@angular/common';

import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '@core/services/notification.service';
import { InvoiceService, EDocDto } from '../invoice.service';
import { AlertComponent } from '@shared/components/alert/alert.component';
import {
  TYPE_MONTANT, TYPE_TAXE, TYPE_PARTNER, TYPE_DATE, labelOf, CodeLabel
} from '../teif-constants';
import { InvoiceDetailComponent } from './invoice-detail.component';
import { InvoiceDetailErrorsComponent } from './invoice-detail-errors.component';

/** Critères de recherche utilisés par ConsultInvoice. */
interface EfactCriteria {
  login:          string;
  documentNumber: string;
  documentType:   string;
  dateProcess:    string;
  dateDocument:   string;
  dateDocumentTo: string;
  amountTo:       string;
  amountFrom:     string;
  generatedRef:   string;
  typeUser:       'E' | 'R';
  processStatus:  string;
}

/**
 * InvoiceConsultComponent
 *
 * Migré depuis `ConsultInvoiceCtrl` (invoice-consult.controller.js).
 *
 * Décisions de migration :
 *  - `NgTableParams` (ng-table) → tableau Angular natif avec tri/pagination manuel
 *  - `spinnerService` → `isLoading` signal
 *  - `uib-datepicker-popup` → `<input type="date">` natif HTML5
 *  - `$filter('date')` → `formatDate()` Angular
 *  - `vm` scope de la vue → propriétés publiques du composant
 *  - `ng-include` (invoice-detail.html / invoice-detail-errors.html) → composants standalone
 *  - Validation des dates (limite 31 jours) → portée identique au legacy
 *  - X2JS (xml_str2json) → global window.X2JS (chargé via angular.json scripts)
 *
 * Route : /invoice/consultInvoice (ROLE_USER)
 */
@Component({
  selector: 'app-invoice-consult',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    AlertComponent,
    InvoiceDetailComponent,
    InvoiceDetailErrorsComponent,
  ],
  templateUrl: './invoice-consult.component.html',
})
export class InvoiceConsultComponent implements OnInit {
  private readonly authService    = inject(AuthService);
  private readonly alertService   = inject(AlertService);
  private readonly invoiceService = inject(InvoiceService);

  // ── Référentiels ──────────────────────────────────────────────────────────
  readonly typeMontant = TYPE_MONTANT;
  readonly typeTaxe    = TYPE_TAXE;
  readonly typePartner = TYPE_PARTNER;
  readonly typeDate    = TYPE_DATE;
  readonly labelOf     = labelOf;

  // ── Compte utilisateur ────────────────────────────────────────────────────
  readonly account = computed(() => this.authService.account());

  // ── Critères ──────────────────────────────────────────────────────────────
  criteria: EfactCriteria = this._defaultCriteria();

  /** Dates gérées séparément (datepicker → string ISO pour input[type=date]). */
  dateProcess:    string = '';
  dateDocument:   string = this._today();
  dateDocumentTo: string = this._today();

  // ── Résultats ─────────────────────────────────────────────────────────────
  eDocs: EDocDto[] = [];

  /** Pagination manuelle (remplace NgTableParams). */
  page         = 1;
  pageSize     = 15;
  get pagedEDocs(): EDocDto[] {
    const start = (this.page - 1) * this.pageSize;
    return this.eDocs.slice(start, start + this.pageSize);
  }
  get totalPages(): number { return Math.ceil(this.eDocs.length / this.pageSize); }

  // ── Détail inline ─────────────────────────────────────────────────────────
  ligneNumber: number | null = null;
  teif:        any  = {};
  errors:      string[] = [];

  tab = 1;
  setTab(t: number) { this.tab = t; }
  isSet(t: number)  { return this.tab === t; }

  // ── Loaders ───────────────────────────────────────────────────────────────
  readonly isLoading      = signal(false);
  readonly isLoadingDetail = signal(false);
  readonly isLoadingPdf   = signal(false);

  ngOnInit(): void { /* rien : l'utilisateur déclenche la recherche */ }

  // ── Recherche ─────────────────────────────────────────────────────────────

  fetchEDocs(): void {
    const DAY_MS = 1000 * 60 * 60 * 24;
    const today  = new Date();

    // Validation : au moins un critère obligatoire
    if (!this.dateProcess && !this.dateDocument && !this.dateDocumentTo
        && !this.criteria.documentNumber && !this.criteria.generatedRef) {
      this.alertService.error(
        'Veuillez saisir au moins un des criteres de recherche suivants: '
        + 'Reference ttn, Num Facture, Date Insertion, date debut facture, date fin facture'
      );
      return;
    }

    // Validation : limite 31 jours (portée identique au legacy)
    if (!this.dateProcess && !this.dateDocumentTo && !this.criteria.generatedRef && this.dateDocument) {
      const dayDiff = Math.floor((today.getTime() - new Date(this.dateDocument).getTime()) / DAY_MS) + 1;
      if (dayDiff > 31) { this.alertService.error('La consultation électronique des factures est limitée à un mois passé à partir de la date courante'); return; }
      if (dayDiff < 0)  { this.alertService.error('Date facture superieur date du jour'); return; }
    }
    if (!this.dateProcess && !this.dateDocument && !this.criteria.generatedRef && this.dateDocumentTo) {
      const dayDiff = Math.floor((today.getTime() - new Date(this.dateDocumentTo).getTime()) / DAY_MS) + 1;
      if (dayDiff > 31) { this.alertService.error('La consultation électronique des factures est limitée à un mois à partir de la date courante'); return; }
      if (dayDiff < 0)  { this.alertService.error('Date facture superieur date du jour'); return; }
    }
    if (!this.dateProcess && this.dateDocument && !this.criteria.generatedRef && this.dateDocumentTo) {
      const dayDiff = Math.floor((new Date(this.dateDocumentTo).getTime() - new Date(this.dateDocument).getTime()) / DAY_MS) + 1;
      if (dayDiff > 31) { this.alertService.error('La consultation électronique des factures est limitée à un seul mois.'); return; }
      if (dayDiff < 0)  { this.alertService.error('Date debut facture superieur date fin facture'); return; }
    }

    this.isLoading.set(true);
    this.criteria.login          = this.account()?.login ?? '';
    this.criteria.dateProcess    = this.dateProcess    ?? '';
    this.criteria.dateDocument   = this.dateDocument   ?? '';
    this.criteria.dateDocumentTo = this.dateDocumentTo ?? '';

    this.invoiceService.fetchEDocs(this.criteria).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          this.alertService.info('Pas de factures avec ces critères de recherche');
          this.eDocs = [];
        } else {
          this.eDocs = data;
        }
        this.page = 1;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.alertService.error('Erreur Lors du recherche');
        console.error(err);
      },
    });
  }

  reset(): void {
    this.criteria      = this._defaultCriteria();
    this.dateProcess   = '';
    this.dateDocument  = this._today();
    this.dateDocumentTo = this._today();
    this.eDocs         = [];
    this.errors        = [];
    this.ligneNumber   = null;
    this.teif          = {};
    this.page          = 1;
  }

  // ── Détail inline ─────────────────────────────────────────────────────────

  showDetailInvoice(index: number, documentId: number): void {
    if (this.ligneNumber === index) {
      this.ligneNumber = null;
      this.teif        = {};
      return;
    }
    this.ligneNumber = index;
    this.isLoadingDetail.set(true);

    this.invoiceService.getTeif(this.account()?.login ?? '', documentId).subscribe({
      next: (raw) => {
        this.teif = this._parseTeifXml(raw);
        this.isLoadingDetail.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoadingDetail.set(false);
      },
    });
  }

  showDetailInvoiceError(index: number, documentId: number): void {
    if (this.ligneNumber === index) {
      this.ligneNumber = null;
      this.errors = [];
      return;
    }
    this.errors      = [];
    this.ligneNumber = index;
    this.isLoadingDetail.set(true);

    this.invoiceService.getErrors(documentId).subscribe({
      next: (data) => {
        this.errors = data;
        this.isLoadingDetail.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoadingDetail.set(false);
      },
    });
  }

  showInvoicePdf(documentId: number): void {
    this.isLoadingPdf.set(true);
    this.invoiceService.fillReport(documentId).subscribe({
      next: (data) => {
        this.invoiceService.openPdf(data, `facture-${documentId}.pdf`);
        this.isLoadingPdf.set(false);
      },
      error: () => this.isLoadingPdf.set(false),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getStatusLabel(status: string): string {
    switch (status) {
      case 'E': return 'Traitée';
      case 'X': return 'Eronnée';
      case 'R': return 'En cours de validation';
      default:  return status;
    }
  }

  private _parseTeifXml(raw: string): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    let xml = raw
      .replace(/\\u[\dA-Fa-f]{4}/g, m => String.fromCharCode(parseInt(m.slice(2), 16)))
      .replace(/\\"/g, "'");

    if (!win.X2JS) { console.error('[ConsultInvoice] X2JS non chargé'); return {}; }
    const x2js = new win.X2JS({
      arrayAccessFormPaths: [
        'TEIF.InvoiceBody.Dtm.DateText',
        'TEIF.InvoiceBody.PartnerSection.PartnerDetails',
        'TEIF.InvoiceBody.PartnerSection.PartnerDetails.Nad.PartnerAdresses',
        'TEIF.InvoiceBody.PartnerSection.PartnerDetails.Loc',
        'TEIF.InvoiceBody.PartnerSection.PartnerDetails.CtaSection',
        'TEIF.InvoiceBody.PartnerSection.PartnerDetails.RffSection',
        // ← manquants dans la migration — présents dans le legacy ConsultInvoiceCtrl :
        'TEIF.InvoiceBody.PartnerSection.PartnerDetails.RffSection.ReferenceDate.DateText',
        'TEIF.InvoiceBody.PytSection.PytSectionDetails',
        'TEIF.InvoiceBody.PytSection.PytSectionDetails.PytDtm.DateText',
        'TEIF.InvoiceBody.Ftx.FreeTextDetail',
        'TEIF.InvoiceBody.SpecialConditions',
        'TEIF.InvoiceBody.LinSection.Lin',
        'TEIF.InvoiceBody.LinSection.Lin.LinMoa.MoaDetails',
        // ← manquant dans la migration :
        'TEIF.InvoiceBody.LinSection.Lin.LinDtm.DateText',
        'TEIF.InvoiceBody.InvoiceMoa.AmountDetails',
        'TEIF.InvoiceBody.InvoiceTax.InvoiceTaxDetails',
        'TEIF.InvoiceBody.InvoiceTax.InvoiceTaxDetails.AmountDetails',
        'TEIF.InvoiceBody.InvoiceAlc.AllowanceDetails',
      ],
    });
    const obj = x2js.xml_str2json(xml);
    // Normaliser DateText en tableau (legacy AngularJS le faisait manuellement)
    if (obj?.TEIF?.InvoiceBody?.Dtm?.DateText && !Array.isArray(obj.TEIF.InvoiceBody.Dtm.DateText)) {
      obj.TEIF.InvoiceBody.Dtm.DateText = [obj.TEIF.InvoiceBody.Dtm.DateText];
    }
    return obj;
  }

  private _today(): string {
    return formatDate(new Date(), 'yyyy-MM-dd', 'fr');
  }

  private _defaultCriteria(): EfactCriteria {
    return {
      login: '', documentNumber: '', documentType: '', dateProcess: '',
      dateDocument: '', dateDocumentTo: '', amountTo: '', amountFrom: '',
      generatedRef: '', typeUser: 'E', processStatus: '',
    };
  }
}
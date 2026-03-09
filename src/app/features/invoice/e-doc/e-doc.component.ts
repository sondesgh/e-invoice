import {
  Component, OnInit, signal, inject, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { formatDate } from '@angular/common';

import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '@core/services/notification.service';
import { EDocService, EDoc } from './e-doc.service';
import { InvoiceService, EDocDto, SendPayload } from '../invoice.service';
import { AlertComponent } from '@shared/components/alert/alert.component';
import {
  TYPE_MONTANT, TYPE_TAXE, TYPE_PARTNER, TYPE_DATE, TYPE_FACT, labelOf
} from '../teif-constants';
import { ParseLinksService } from '@shared/services/pagination/parse-links.service';
import { EDocDeleteDialogComponent,EDocDialogComponent } from './e-doc.component-dialog.component';
import { InvoiceDetailComponent } from '../consult/invoice-detail.component';
import { InvoiceDetailErrorsComponent } from '../consult/invoice-detail-errors.component';

/**
 * EDocComponent
 *
 * Migré depuis `EDocController` (e-doc.controller.js).
 *
 * Les états modaux (new/edit/delete) utilisés via `$uibModal` dans le legacy
 * sont remplacés par des sous-composants inline conditionnels.
 *
 * Décisions de migration :
 *  - `$uibModal` (new/edit/delete) → composants modaux inline avec signaux
 *  - `PaginationUtil.parsePage/Predicate/Ascending` → propriétés directes
 *  - `pagingParams` resolver → `ActivatedRoute.queryParams` (si nécessaire)
 *  - `X2JS` → global window.X2JS
 *  - `alert()` natif (sendFatooras) → AlertService
 *  - `saveAs` (FileSaver) → InvoiceService.openPdf()
 *  - `speak()` (responsiveVoice commenté) → supprimé
 *
 * Routes :
 *  - /invoice/e-doc                (ROLE_USER, ROLE_SUPPORT)
 *  - /invoice/e-doc/{id}           (ROLE_ADMIN) → EDocDetailComponent
 *  - /invoice/e-doc/new            (ROLE_ADMIN) → modal
 *  - /invoice/e-doc/{id}/edit      (ROLE_ADMIN) → modal
 *  - /invoice/e-doc/{id}/delete    (ROLE_ADMIN) → modal
 */
@Component({
  selector: 'app-e-doc',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    AlertComponent,
    InvoiceDetailComponent,
    InvoiceDetailErrorsComponent,
    EDocDialogComponent,
    EDocDeleteDialogComponent,
  ],
  templateUrl: './e-doc.component.html',
})
export class EDocComponent implements OnInit {
  private readonly authService    = inject(AuthService);
  private readonly alertService   = inject(AlertService);
  private readonly eDocService    = inject(EDocService);
  private readonly invoiceService = inject(InvoiceService);
  private readonly parseLinks     = inject(ParseLinksService);

  // ── Référentiels ──────────────────────────────────────────────────────────
  readonly typeFact    = TYPE_FACT;
  readonly typeMontant = TYPE_MONTANT;
  readonly typeTaxe    = TYPE_TAXE;
  readonly typePartner = TYPE_PARTNER;
  readonly typeDate    = TYPE_DATE;
  readonly labelOf     = labelOf;

  readonly account = computed(() => this.authService.account());

  // ── Pagination ────────────────────────────────────────────────────────────
  page         = 1;
  pageSize     = 10;
  predicate    = 'id';
  ascending    = true;
  totalItems   = 0;

  // ── Résultats ─────────────────────────────────────────────────────────────
  eDocs:       EDocDto[] = [];
  showSelected = false;

  // ── Critères ──────────────────────────────────────────────────────────────
  efactCriteria = this._defaultCriteria();
  dateProcess   = '';
  dateDocument  = '';
  dateDocumentTo = '';
  dateProcessTo  = '';

  // ── Détail inline ─────────────────────────────────────────────────────────
  ligneNumber: number | null = null;
  teif:        any = {};
  errors:      string[] = [];
  tab = 1;
  setTab(t: number) { this.tab = t; }
  isSet(t: number)  { return this.tab === t; }

  // ── Loaders ───────────────────────────────────────────────────────────────
  readonly loader = signal({ detail: false, pdf: false, error: false, send: false });

  // ── Modaux (admin) ────────────────────────────────────────────────────────
  showDialog       = false;
  showDeleteDialog = false;
  selectedEDoc:    EDoc | null = null;

  ngOnInit(): void { /* recherche déclenchée manuellement */ }

  // ── Recherche ─────────────────────────────────────────────────────────────

  fetchEDocs(): void {
    const sort = [`${this.predicate},${this.ascending ? 'asc' : 'desc'}`, 'id'];

    // Copier les dates
    this.efactCriteria.dateProcess    = this.dateProcess    ?? '';
    this.efactCriteria.dateProcessTo  = this.dateProcessTo  ?? '';
    this.efactCriteria.dateDocument   = this.dateDocument   ?? '';
    this.efactCriteria.dateDocumentTo = this.dateDocumentTo ?? '';

    this.eDocService.search({ page: this.page - 1, size: this.pageSize, sort }, this.efactCriteria as any)
      .subscribe({
        next: (resp) => {
          const linkHeader = resp.headers.get('link');
          if (linkHeader) {
            try { this.parseLinks.parse(linkHeader); } catch (_) {}
          }
          this.totalItems  = Number(resp.headers.get('X-Total-Count') ?? 0);
          this.eDocs       = (resp.body ?? []) as unknown as EDocDto[];
          this.showSelected = !!this.efactCriteria.receiverCode;
        },
        error: (err) => {
          this.eDocs        = [];
          this.showSelected = false;
          if (err.status === 401) {
            this.alertService.error("Vous n'êtes pas autorisés de consulter des factures avec ces critères de recherche !!");
          }
        },
      });
  }

  loadPage(page: number): void {
    this.page = page;
    this.fetchEDocs();
  }

  sortBy(predicate: string): void {
    if (this.predicate === predicate) {
      this.ascending = !this.ascending;
    } else {
      this.predicate = predicate;
      this.ascending = true;
    }
    this.fetchEDocs();
  }

  updatePartner(): void {
    const acc = this.account();
    if (!acc) return;
    if (this.efactCriteria.typeUser === 'E') {
      this.efactCriteria.partnerCode  = acc.partnerCode!;//! ajouté  vu obligatoire sinon account.partnerCode ?? ''
      this.efactCriteria.receiverCode = '';
    } else if (this.efactCriteria.typeUser === 'R') {
      this.efactCriteria.partnerCode  = '';
      this.efactCriteria.receiverCode = acc.partnerCode!;//! ajouté  vu obligatoire sinon account.partnerCode ?? ''
    } else {
      this.efactCriteria.partnerCode  = '';
      this.efactCriteria.receiverCode = '';
    }
  }

  clear(): void {
    this.page         = 1;
    this.predicate    = 'id';
    this.ascending    = true;
    this.totalItems   = 0;
    this.eDocs        = [];
    this.errors       = [];
    this.teif         = {};
    this.showSelected = false;
    this.efactCriteria = this._defaultCriteria();
    this.dateProcess = this.dateProcessTo = this.dateDocument = this.dateDocumentTo = '';
  }

  // ── Détail ────────────────────────────────────────────────────────────────

  showDetailInvoice(index: number, documentId: number): void {
    if (this.ligneNumber === index) { this.ligneNumber = null; this.teif = {}; return; }
    this.ligneNumber = index;
    this.loader.update(l => ({ ...l, detail: true }));

    this.invoiceService.getTeif(this.account()?.login ?? '', documentId).subscribe({
      next: (raw) => {
        this.teif = this._parseTeif(raw);
        this.loader.update(l => ({ ...l, detail: false }));
      },
      error: (err) => { console.error(err); this.loader.update(l => ({ ...l, detail: false })); },
    });
  }

  showDetailInvoiceError(index: number, documentId: number): void {
    if (this.ligneNumber === index) { this.ligneNumber = null; this.errors = []; return; }
    this.errors      = [];
    this.ligneNumber = index;
    this.loader.update(l => ({ ...l, error: true }));

    this.invoiceService.getErrors(documentId).subscribe({
      next: (data) => { this.errors = data; this.loader.update(l => ({ ...l, error: false })); },
      error: (err) => { console.error(err); this.loader.update(l => ({ ...l, error: false })); },
    });
  }

  showInvoicePdf(documentId: number): void {
    this.loader.update(l => ({ ...l, pdf: true }));
    this.invoiceService.fillReport(documentId).subscribe({
      next: (data) => { this.invoiceService.openPdf(data, `facture-${documentId}.pdf`); this.loader.update(l => ({ ...l, pdf: false })); },
      error: () => this.loader.update(l => ({ ...l, pdf: false })),
    });
  }

  // ── Envoi ─────────────────────────────────────────────────────────────────

  sendFatoorasTo(): void {
    const toSend: SendPayload[] = this.eDocs
      .filter((d: any) => d.toSend)
      .map(d => ({ documentId: d.id, generatedRef: d.generatedRef }));
    if (!toSend.length) return;
    this.invoiceService.sendFatooras(this.efactCriteria.receiverCode!, toSend).subscribe({
      next: (msg) => this.alertService.success(msg),
      error: (err) => this.alertService.error(err?.error ?? 'Erreur envoi'),
    });
  }

  sendFatooraTo(receiver: string, documentId: number, generatedRef: string): void {
    this.loader.update(l => ({ ...l, send: true }));
    this.invoiceService.sendFatooras(receiver, [{ documentId, generatedRef }]).subscribe({
      next: (msg) => { this.alertService.success(msg); this.loader.update(l => ({ ...l, send: false })); },
      error: (err) => { this.alertService.error(err?.error ?? 'Erreur'); this.loader.update(l => ({ ...l, send: false })); },
    });
  }

  // ── Modaux Admin ──────────────────────────────────────────────────────────

  openNew(): void {
    this.selectedEDoc = null;
    this.showDialog   = true;
  }

  openEdit(id: number): void {
    this.eDocService.get(id).subscribe(doc => {
      this.selectedEDoc = doc;
      this.showDialog   = true;
    });
  }

  openDelete(id: number): void {
    this.eDocService.get(id).subscribe(doc => {
      this.selectedEDoc    = doc;
      this.showDeleteDialog = true;
    });
  }

  onDialogSaved(): void {
    this.showDialog   = false;
    this.selectedEDoc = null;
    this.fetchEDocs();
  }

  onDialogCancelled(): void {
    this.showDialog      = false;
    this.showDeleteDialog = false;
    this.selectedEDoc    = null;
  }

  onDeleted(): void {
    this.showDeleteDialog = false;
    this.selectedEDoc    = null;
    this.fetchEDocs();
  }

  /** Alias utilisé dans le template — délègue à onDeleted(). */
  onDeleteConfirmed(): void { this.onDeleted(); }

  // ── Pagination helpers ────────────────────────────────────────────────────
  totalPages(): number { return Math.ceil(this.totalItems / this.pageSize) || 1; }

  pageNumbers(): number[] {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  goToPage(p: number): void {
    const total = this.totalPages();
    if (p < 1 || p > total) return;
    this.loadPage(p);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getStatusLabel(s: string): string {
    return s === 'E' ? 'Traitée' : s === 'X' ? 'Eronnée' : s === 'R' ? 'En cours de validation' : s;
  }

  private _parseTeif(raw: string): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const xml = raw
      .replace(/\\u[\dA-Fa-f]{4}/g, m => String.fromCharCode(parseInt(m.slice(2), 16)))
      .replace(/\\"/g, "'");
    if (!win.X2JS) return {};
    const x2js = new win.X2JS({
      arrayAccessFormPaths: [
        'TEIF.InvoiceBody.Dtm.DateText',
        'TEIF.InvoiceBody.PartnerSection.PartnerDetails',
        'TEIF.InvoiceBody.LinSection.Lin',
        'TEIF.InvoiceBody.LinSection.Lin.LinMoa.MoaDetails',
        'TEIF.InvoiceBody.InvoiceMoa.AmountDetails',
        'TEIF.InvoiceBody.InvoiceTax.InvoiceTaxDetails',
        'TEIF.InvoiceBody.InvoiceTax.InvoiceTaxDetails.AmountDetails',
      ],
    });
    const obj = x2js.xml_str2json(xml);
    if (obj?.TEIF?.InvoiceBody?.Dtm?.DateText && !Array.isArray(obj.TEIF.InvoiceBody.Dtm.DateText)) {
      obj.TEIF.InvoiceBody.Dtm.DateText = [obj.TEIF.InvoiceBody.Dtm.DateText];
    }
    return obj;
  }

  private _defaultCriteria() {
    return {
      login: '', documentNumber: '', dateProcess: '', dateProcessTo: '',
      dateDocument: '', dateDocumentTo: '', amountTtcFrom: '', amountTtcTo: '',
      amountTax: '', amountTaxTo: '', generatedRef: '', processStatus: '',
      typeUser: '', partnerCode: '', receiverCode: '', documentType: '',
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EDocDetailComponent — Migré depuis EDocDetailController + e-doc-detail.html
// ════════════════════════════════════════════════════════════════════════════

import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-e-doc-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule],
  template: `
    <div>
      <h2>
        <span translate="portailElFatooraApp.eDoc.detail.title"></span>
        {{ eDoc?.id }}
      </h2>
      <hr />
      <dl class="dl-horizontal jh-entity-details">
        <dt translate="portailElFatooraApp.eDoc.receiverCode"></dt>
        <dd>{{ eDoc?.receiverCode }}</dd>
        <dt translate="portailElFatooraApp.eDoc.documentNumber"></dt>
        <dd>{{ eDoc?.documentNumber }}</dd>
        <dt translate="portailElFatooraApp.eDoc.documentType"></dt>
        <dd>{{ eDoc?.documentType }}</dd>
        <dt translate="portailElFatooraApp.eDoc.dateProcess"></dt>
        <dd>{{ eDoc?.dateProcess | date:'mediumDate' }}</dd>
        <dt translate="portailElFatooraApp.eDoc.dateDocument"></dt>
        <dd>{{ eDoc?.dateDocument | date:'mediumDate' }}</dd>
        <dt translate="portailElFatooraApp.eDoc.amountTax"></dt>
        <dd>{{ eDoc?.amountTax }}</dd>
        <dt translate="portailElFatooraApp.eDoc.amount"></dt>
        <dd>{{ eDoc?.amount }}</dd>
        <dt translate="portailElFatooraApp.eDoc.generatedRef"></dt>
        <dd>{{ eDoc?.generatedRef }}</dd>
        <dt translate="portailElFatooraApp.eDoc.processStatus"></dt>
        <dd>{{ eDoc?.processStatus }}</dd>
        <dt translate="portailElFatooraApp.eDoc.partnerBySenderCode"></dt>
        <dd>
          <a [routerLink]="['/admin/partner', eDoc?.partnerBySenderCode?.id]">
            {{ eDoc?.partnerBySenderCode?.id }}
          </a>
        </dd>
      </dl>

      <button type="button" class="btn btn-info" onclick="window.history.back()">
        <span class="glyphicon glyphicon-arrow-left"></span>&nbsp;
        <span translate="entity.action.back"></span>
      </button>
    </div>
  `,
})
export class EDocDetailComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly eDocService = inject(EDocService);

  eDoc: EDoc | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.eDocService.get(id).subscribe(doc => { this.eDoc = doc; });
    }
  }
}

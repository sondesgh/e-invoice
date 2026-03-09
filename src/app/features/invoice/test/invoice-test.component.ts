import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { InvoiceService } from '../invoice.service';
import { ProfileService } from '@core/services/profiles/profile.service';
import {
  TYPE_FACT, TYPE_MONTANT, TYPE_TAXE, TYPE_PARTNER, TYPE_DATE,
  TYPE_MATRICULE, LOCATION_TYPES, CONTACT_TYPES, COM_MEANS_TYPES,
  PAYMENT_TERMS, PAYMENT_CONDITIONS, PAYMENT_MEANS, FINANCIAL_INSTIT,
  REFERENCE_TYPES, ALLOWANCE_TYPES, FTX_SUBJECT_CODES, FORMAT_DATES
} from '../teif-constants';

declare const X2JS: any;

const MAX_FILE_SIZE = 2097152; // 2 MB
const TEIF_ARRAY_PATHS = [
  'TEIF.InvoiceBody.Dtm.DateText',
  'TEIF.InvoiceBody.PartnerSection.PartnerDetails',
  'TEIF.InvoiceBody.PartnerSection.PartnerDetails.Nad.PartnerAdresses',
  'TEIF.InvoiceBody.PartnerSection.PartnerDetails.Loc',
  'TEIF.InvoiceBody.PartnerSection.PartnerDetails.CtaSection',
  'TEIF.InvoiceBody.PartnerSection.PartnerDetails.RffSection',
  'TEIF.InvoiceBody.PartnerSection.PartnerDetails.RffSection.ReferenceDate.DateText',
  'TEIF.InvoiceBody.PytSection.PytSectionDetails',
  'TEIF.InvoiceBody.PytSection.PytSectionDetails.PytDtm.DateText',
  'TEIF.InvoiceBody.Ftx.FreeTextDetail',
  'TEIF.InvoiceBody.SpecialConditions',
  'TEIF.InvoiceBody.LinSection.Lin',
  'TEIF.InvoiceBody.LinSection.Lin.LinMoa.MoaDetails',
  'TEIF.InvoiceBody.LinSection.Lin.LinDtm.DateText',
  'TEIF.InvoiceBody.InvoiceMoa.AmountDetails',
  'TEIF.InvoiceBody.InvoiceTax.InvoiceTaxDetails',
  'TEIF.InvoiceBody.InvoiceTax.InvoiceTaxDetails.AmountDetails',
  'TEIF.InvoiceBody.InvoiceAlc.AllowanceDetails',
];

/**
 * InvoiceTestComponent — Outil de test/validation TEIF
 *
 * Permet de :
 * 1. Choisir un fichier XML TEIF
 * 2. Sélectionner la version XSD et si la facture est signée
 * 3. Valider via InvoiceService.validateTeif()
 * 4. Importer (parser) le TEIF dans le formulaire pour inspection
 *
 * Pas de signature dans ce composant (TestInvoiceCtrl avait showModal2/applet Java — supprimé).
 */
@Component({
  selector: 'app-invoice-test',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
<div class="wrapper1">
  <section class="bg-transparent">
    <div class="row">
      <div class="col-md-12">
        <br><br>
        <div class="row">
          <div class="col-sm-12 form-box">
            <div class="form-bottom">

              <div class="row">
                <div class="col-md-3">
                  <ol class="breadcrumb">
                    <li><a routerLink="/home"><span class="glyphicon glyphicon-home"></span> Home</a></li>
                    <li class="active">Test Facture</li>
                  </ol>
                </div>
              </div>

              <!-- Alerts -->
              <div *ngFor="let alert of alerts()" class="alert {{alert.type}} divAlert text-center">
                {{ alert.message }}
              </div>
              <br>

              <form name="myForm" #myForm="ngForm" class="form-horizontal text-left">

                <!-- File + version + signed options -->
                <div class="panel panel-default">
                  <div class="panel-heading">Paramètres de validation</div>
                  <div class="panel-body">
                    <div class="form-group">
                      <label class="col-md-2 control-label">Fichier XML TEIF</label>
                      <div class="col-md-4">
                        <input type="file" id="file" name="file"
                          class="btn btn-default btn-sm" accept="application/xml"
                          (change)="controlXml()">
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="col-md-2 control-label">Version XSD</label>
                      <div class="col-md-3">
                        <select class="form-control" [(ngModel)]="versionNumber" name="xsdVersion">
                          <option *ngFor="let v of xsdVersionNumbers" [value]="v">{{ v }}</option>
                        </select>
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="col-md-2 control-label">Type de facture</label>
                      <div class="col-md-3">
                        <select class="form-control" [(ngModel)]="signedInvoice" name="signedInvoice">
                          <option *ngFor="let s of signedList" [value]="s.id">{{ s.name }}</option>
                        </select>
                      </div>
                    </div>

                    <div class="form-group">
                      <div class="col-md-offset-2 col-md-6">
                        <button type="button" class="btn btn-info btn-sm"
                          [disabled]="disValidInvoice()"
                          (click)="validateTeif()">
                          <span *ngIf="!loader().valid">Valider</span>
                          <span *ngIf="loader().valid">Validation en cours...</span>
                        </button>
                        &nbsp;
                        <button type="button" class="btn btn-primary btn-sm"
                          [disabled]="disImportInvoice()"
                          (click)="importTeif()">
                          <span *ngIf="!loader().import">Importer</span>
                          <span *ngIf="loader().import">Import en cours...</span>
                        </button>
                        &nbsp;
                        <button type="button" class="btn btn-warning btn-sm"
                          (click)="reset()">
                          Initialiser
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- TEIF form (visible after import) -->
                <div *ngIf="teifImported()">

                  <!-- InvoiceHeader -->
                  <div class="panel panel-default">
                    <div class="panel-heading">Entête Facture</div>
                    <div class="panel-body">
                      <div class="form-group">
                        <label class="col-md-2 control-label">Expéditeur</label>
                        <div class="col-md-2">
                          <select class="form-control" [(ngModel)]="invoiceHeader.MessageSenderIdentifier._type" name="senderType">
                            <option *ngFor="let m of typeMatricule" [value]="m.id">{{m.name}}</option>
                          </select>
                        </div>
                        <div class="col-md-3">
                          <input type="text" class="form-control" [(ngModel)]="invoiceHeader.MessageSenderIdentifier.__text" name="senderText">
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- BGM / Dates -->
                  <div class="panel panel-default">
                    <div class="panel-heading">Identification Facture</div>
                    <div class="panel-body">
                      <div class="form-group">
                        <label class="col-md-2 control-label">N° Facture</label>
                        <div class="col-md-3">
                          <input type="text" class="form-control" [(ngModel)]="bgm.DocumentIdentifier" name="docId">
                        </div>
                        <label class="col-md-2 control-label">Type</label>
                        <div class="col-md-3">
                          <select class="form-control" [(ngModel)]="bgm.DocumentType._code" name="docType">
                            <option *ngFor="let t of typeFact" [value]="t.id">{{t.name}}</option>
                          </select>
                        </div>
                      </div>

                      <!-- Dates -->
                      <div *ngFor="let d of dtm.DateText; let i = index" class="form-group">
                        <label class="col-md-2 control-label">Date {{i+1}}</label>
                        <div class="col-md-2">
                          <select class="form-control" [(ngModel)]="d._functionCode" [name]="'dtmCode'+i">
                            <option *ngFor="let t of typeDate" [value]="t.id">{{t.name}}</option>
                          </select>
                        </div>
                        <div class="col-md-2">
                          <select class="form-control" [(ngModel)]="d._format" [name]="'dtmFmt'+i">
                            <option *ngFor="let f of formatDat" [value]="f.id">{{f.name}}</option>
                          </select>
                        </div>
                        <div class="col-md-3">
                          <input type="text" class="form-control" [(ngModel)]="d.__text" [name]="'dtmVal'+i">
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Partners -->
                  <div class="panel panel-default" *ngFor="let p of partnerDetails.PartnerDetails; let pi = index">
                    <div class="panel-heading">Partenaire {{pi+1}}</div>
                    <div class="panel-body">
                      <div class="form-group">
                        <label class="col-md-2 control-label">Rôle</label>
                        <div class="col-md-2">
                          <select class="form-control" [(ngModel)]="p._functionCode" [name]="'pType'+pi">
                            <option *ngFor="let t of typePartner" [value]="t.id">{{t.name}}</option>
                          </select>
                        </div>
                        <label class="col-md-2 control-label">Nom</label>
                        <div class="col-md-3">
                          <input type="text" class="form-control" [(ngModel)]="p.Nad.PartnerName.__text" [name]="'pName'+pi">
                        </div>
                      </div>
                      <div class="form-group">
                        <label class="col-md-2 control-label">Matricule</label>
                        <div class="col-md-2">
                          <select class="form-control" [(ngModel)]="p.Nad.PartnerIdentifier._type" [name]="'pMatType'+pi">
                            <option *ngFor="let m of typeMatricule" [value]="m.id">{{m.name}}</option>
                          </select>
                        </div>
                        <div class="col-md-2">
                          <input type="text" class="form-control" [(ngModel)]="p.Nad.PartnerIdentifier.__text" [name]="'pMatVal'+pi">
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Articles -->
                  <div class="panel panel-default">
                    <div class="panel-heading">Articles</div>
                    <div class="panel-body">
                      <div *ngFor="let l of lin.Lin; let li = index" class="well well-sm">
                        <div class="row">
                          <div class="col-md-1"><strong>{{li+1}}</strong></div>
                          <div class="col-md-3">{{ l.LinImd?.ItemCode }} — {{ l.LinImd?.ItemDescription }}</div>
                          <div class="col-md-2">Qté: {{ l.LinQty?.Quantity?.__text }} {{ l.LinQty?.Quantity?._measurementUnit }}</div>
                          <div class="col-md-3">
                            <span *ngFor="let m of l.LinMoa?.MoaDetails">
                              {{ m.Moa?._amountTypeCode }}: {{ m.Moa?.Amount?.__text }}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p *ngIf="lin.Lin.length === 0" class="text-muted">Aucun article</p>
                    </div>
                  </div>

                  <!-- Montants -->
                  <div class="panel panel-default">
                    <div class="panel-heading">Montants</div>
                    <div class="panel-body">
                      <table class="table table-condensed table-bordered">
                        <thead>
                          <tr><th>Type</th><th>Montant</th><th>Devise</th></tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let a of amountDetails.AmountDetails; let ai = index">
                            <td>
                              <select class="form-control input-sm" [(ngModel)]="a.Moa._amountTypeCode" [name]="'amtType'+ai">
                                <option *ngFor="let m of typeMontant" [value]="m.id">{{m.name}}</option>
                              </select>
                            </td>
                            <td>
                              <input type="number" class="form-control input-sm" [(ngModel)]="a.Moa.Amount.__text" [name]="'amtVal'+ai">
                            </td>
                            <td>{{ a.Moa.Amount._currencyIdentifier }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <!-- Taxes -->
                  <div class="panel panel-default">
                    <div class="panel-heading">Taxes</div>
                    <div class="panel-body">
                      <table class="table table-condensed table-bordered">
                        <thead>
                          <tr><th>Type Taxe</th><th>Taux</th><th>Montant</th></tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let t of invoiceTaxDetails.InvoiceTaxDetails; let ti = index">
                            <td>
                              <select class="form-control input-sm" [(ngModel)]="t.Tax.TaxTypeName._code" [name]="'taxType'+ti">
                                <option *ngFor="let tx of typeTaxe" [value]="tx.id">{{tx.name}}</option>
                              </select>
                            </td>
                            <td>{{ t.Tax.TaxDetails?.TaxRate }}</td>
                            <td>
                              <span *ngFor="let a of t.AmountDetails">
                                {{ a.Moa?.Amount?.__text }} {{ a.Moa?.Amount?._currencyIdentifier }}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <!-- Réductions/Charges (InvoiceAlc) -->
                  <div class="panel panel-default" *ngIf="invoiceAlc.AllowanceDetails.length > 0">
                    <div class="panel-heading">Réductions / Charges</div>
                    <div class="panel-body">
                      <div *ngFor="let alc of invoiceAlc.AllowanceDetails; let ai = index" class="well well-sm">
                        Type: {{ alc._functionCode }}
                      </div>
                    </div>
                  </div>

                  <!-- PytSection -->
                  <div class="panel panel-default" *ngIf="pytSection.PytSectionDetails.length > 0">
                    <div class="panel-heading">Conditions de paiement</div>
                    <div class="panel-body">
                      <div *ngFor="let pyt of pytSection.PytSectionDetails; let pi = index" class="well well-sm">
                        <strong>Condition {{pi+1}}</strong>
                        — Terme: {{ pyt.Pyt?.PaymentTerms }}
                      </div>
                    </div>
                  </div>

                  <!-- FreeText -->
                  <div class="panel panel-default" *ngIf="ftx.FreeTextDetail.length > 0">
                    <div class="panel-heading">Textes libres</div>
                    <div class="panel-body">
                      <div *ngFor="let f of ftx.FreeTextDetail; let fi = index">
                        <strong>{{f.SubjectCode}}</strong>: {{ f.FreeTexts }}
                      </div>
                    </div>
                  </div>

                </div><!-- end teifImported -->
              </form>

            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>
  `,
})
export class InvoiceTestComponent implements OnInit, OnDestroy {
  private invoiceService = inject(InvoiceService);
  private profileService = inject(ProfileService);
  private translate = inject(TranslateService);

  // ─── Constants ───
  readonly typeFact = TYPE_FACT;
  readonly typeMontant = TYPE_MONTANT;
  readonly typeTaxe = TYPE_TAXE;
  readonly typePartner = TYPE_PARTNER;
  readonly typeDate = TYPE_DATE;
  readonly typeMatricule = TYPE_MATRICULE;
  readonly formatDat = FORMAT_DATES;

  readonly signedList = [
    { id: false, name: 'Facture Non Signée' },
    { id: true, name: 'Facture Signée' }
  ];

  // ─── Signals ───
  alerts = signal<{ message: string; type: string }[]>([]);
  loader = signal({ valid: false, import: false });
  disSign = signal(false);
  disSend = signal(true);
  disImportInvoice = signal(true);
  disValidInvoice = signal(false);
  teifImported = signal(false);

  // ─── Params ───
  versionNumber: string = '';
  signedInvoice: boolean = false;
  xsdVersionNumbers: string[] = [];

  // ─── TEIF model ───
  userInfo: any = {};
  devise: { id: string; name: string }[] = [];
  invoiceHeader = this._defaultInvoiceHeader();
  bgm = this._defaultBgm();
  dtm = this._defaultDtm();
  partnerDetails = this._defaultPartnerDetails();
  lin = { Lin: [] as any[] };
  linType = this._defaultLinType();
  linDtm = { DateText: [] as any[] };
  amountDetails = this._defaultAmountDetails();
  invoiceTaxDetails = this._defaultInvoiceTaxDetails();
  pytSection = { PytSectionDetails: [] as any[] };
  ftx = { FreeTextDetail: [] as any[] };
  specialConditions: any[] = [];
  invoiceAlc = { AllowanceDetails: [] as any[] };
  adRef: any = {};

  private langSub?: Subscription;
  private deviseFr: { id: string; name: string }[] = [];
  private deviseAr: { id: string; name: string }[] = [];

  ngOnInit(): void {
    // Load XSD versions
    this.invoiceService.getXsdVersionList().subscribe((data: any[]) => {
      this.xsdVersionNumbers = data;
    });

    // Load devise list
    this.invoiceService.getDeviseList().subscribe(res => {
      this.deviseFr = res.map((d: any) => ({ id: d.id, name: d.libDevFr }));
      this.deviseAr = res.map((d: any) => ({ id: d.id, name: d.libDevAr }));
      this._applyDeviseLanguage(this.translate.currentLang);
    });

    this.langSub = this.translate.onLangChange.subscribe(e => {
      this._applyDeviseLanguage(e.lang);
    });

    this.profileService.getProfileInfo().subscribe((info: any) => {
      this.userInfo = info;
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  // ─── File size control ───
  controlXml(): void {
    const file = this._getFile();
    if (!file) return;
    this.clearAlerts();
    if (file.size > MAX_FILE_SIZE) {
      this.addAlert('Document de taille superieur 2 MO', 'alert-danger');
      this._clearFileInput();
      this.disValidInvoice.set(true);
    } else {
      this.disValidInvoice.set(false);
    }
  }

  // ─── Validate via backend ───
  validateTeif(): void {
    this.reset();
    const file = this._getFile();
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      this.addAlert('Document de taille superieur 2 MO', 'alert-danger');
      this._clearFileInput();
      return;
    }
    this.loader.update(l => ({ ...l, valid: true }));
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = (e: any) => {
      const data = e.target.result as string;
      this.invoiceService.validateTeif(data, this.signedInvoice, this.versionNumber).subscribe({
        next: (res: any) => {
          this.clearAlerts();
          this.loader.update(l => ({ ...l, valid: false }));
          if (res.response === 'success') {
            this.addAlert('Document Valide', 'alert-info');
            this.disImportInvoice.set(false);
          } else {
            if (res.detail) this.addAlert(res.detail, 'alert-danger');
            if (res.errors) this.addAlert(JSON.stringify(res.errors), 'alert-danger');
          }
        },
        error: (err: any) => {
          this.loader.update(l => ({ ...l, valid: false }));
          this.addAlert('Echec de validation la facture', 'alert-danger');
          if (err.error?.errors) this.addAlert(JSON.stringify(err.error.errors), 'alert-danger');
        }
      });
    };
  }

  // ─── Import / parse XML into form ───
  importTeif(): void {
    const file = this._getFile();
    if (!file) return;
    this.loader.update(l => ({ ...l, import: true }));
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = (e: any) => {
      const xmlText = e.target.result as string;
      const x2js = new X2JS({ arrayAccessFormPaths: TEIF_ARRAY_PATHS });
      const jsonObj = x2js.xml_str2json(xmlText);

      this.invoiceHeader = jsonObj.TEIF.InvoiceHeader;
      this.dtm = jsonObj.TEIF.InvoiceBody.Dtm;
      this.bgm = jsonObj.TEIF.InvoiceBody.Bgm;
      this.partnerDetails = jsonObj.TEIF.InvoiceBody.PartnerSection;

      if (jsonObj.TEIF.InvoiceBody.PytSection !== undefined) {
        this.pytSection = jsonObj.TEIF.InvoiceBody.PytSection;
      }
      if (jsonObj.TEIF.InvoiceBody.Ftx !== undefined) {
        this.ftx = jsonObj.TEIF.InvoiceBody.Ftx;
      }
      if (jsonObj.TEIF.InvoiceBody.SpecialConditions !== undefined) {
        this.specialConditions = jsonObj.TEIF.InvoiceBody.SpecialConditions;
      }
      if (jsonObj.TEIF.InvoiceBody.LinSection !== undefined) {
        this.lin.Lin = jsonObj.TEIF.InvoiceBody.LinSection.Lin;
      }
      this.amountDetails = jsonObj.TEIF.InvoiceBody.InvoiceMoa;
      this.invoiceTaxDetails = jsonObj.TEIF.InvoiceBody.InvoiceTax;

      if (jsonObj.TEIF.InvoiceBody.InvoiceAlc !== undefined) {
        this.invoiceAlc = jsonObj.TEIF.InvoiceBody.InvoiceAlc;
      }

      this.teifImported.set(true);
      this.disImportInvoice.set(true);
      this.clearAlerts();
      this.loader.update(l => ({ ...l, import: false }));
    };
  }

  // ─── Reset ───
  reset(): void {
    this.clearAlerts();
    this.teifImported.set(false);
    this.disImportInvoice.set(true);
    this.disValidInvoice.set(false);
    this.invoiceHeader = this._defaultInvoiceHeader();
    this.bgm = this._defaultBgm();
    this.dtm = this._defaultDtm();
    this.partnerDetails = this._defaultPartnerDetails();
    this.lin = { Lin: [] };
    this.linType = this._defaultLinType();
    this.linDtm = { DateText: [] };
    this.amountDetails = this._defaultAmountDetails();
    this.invoiceTaxDetails = this._defaultInvoiceTaxDetails();
    this.pytSection = { PytSectionDetails: [] };
    this.ftx = { FreeTextDetail: [] };
    this.specialConditions = [];
    this.invoiceAlc = { AllowanceDetails: [] };
    this.adRef = {};
  }

  addAlert(message: string, type: string): void {
    this.alerts.update(a => [...a, { message, type }]);
  }

  clearAlerts(): void {
    this.alerts.set([]);
  }

  private _applyDeviseLanguage(lang: string): void {
    this.devise = lang === 'ar' ? this.deviseAr : this.deviseFr;
  }

  private _getFile(): File | null {
    const input = document.getElementById('file') as HTMLInputElement;
    return input?.files?.[0] ?? null;
  }

  private _clearFileInput(): void {
    const input = document.getElementById('file') as HTMLInputElement;
    if (input) input.value = '';
  }

  // ─── Defaults ───
  private _defaultInvoiceHeader(): any {
    return { MessageSenderIdentifier: { _type: 'I-01', __text: '' }, MessageRecieverIdentifier: {} };
  }

  private _defaultBgm(): any {
    return { DocumentIdentifier: '', DocumentType: { _code: '', __text: '' } };
  }

  private _defaultDtm(): any {
    return { DateText: [{ _functionCode: 'I-31', _format: '', __text: '' }] };
  }

  private _defaultPartnerDetails(): any {
    return {
      PartnerDetails: [
        { Nad: { PartnerIdentifier: { _type: '', __text: '' }, PartnerName: { _nameType: '', __text: '' }, PartnerAdresses: [] }, Loc: [], RffSection: [], CtaSection: [], _functionCode: 'I-62' },
        { Nad: { PartnerIdentifier: { _type: '', __text: '' }, PartnerName: { _nameType: '', __text: '' }, PartnerAdresses: [] }, Loc: [], RffSection: [], CtaSection: [], _functionCode: 'I-64' }
      ]
    };
  }

  private _defaultLinType(): any {
    return {
      ItemIdentifier: '',
      LinImd: { ItemCode: '', ItemDescription: '', _lang: 'fr' },
      LinQty: { Quantity: { _measurementUnit: '', __text: '' } },
      LinTax: { TaxTypeName: { _code: '', __text: '' }, TaxCategory: '', TaxDetails: { TaxRate: '', TaxRateBasis: '' } },
      LinMoa: {
        MoaDetails: [
          { Moa: { Amount: { __text: '', _currencyIdentifier: '' }, AmountDescription: { __text: '', _lang: 'fr' }, _currencyCodeList: 'ISO_4217', _amountTypeCode: 'I-183' } },
          { Moa: { Amount: { __text: '', _currencyIdentifier: '' }, AmountDescription: { __text: '', _lang: 'fr' }, _currencyCodeList: 'ISO_4217', _amountTypeCode: 'I-171' } }
        ]
      }
    };
  }

  private _defaultAmountDetails(): any {
    return {
      AmountDetails: [
        { Moa: { Amount: { __text: '', _currencyIdentifier: '' }, AmountDescription: { __text: '', _lang: 'fr' }, _currencyCodeList: 'ISO_4217', _amountTypeCode: 'I-176' } },
        { Moa: { Amount: { __text: '', _currencyIdentifier: '' }, AmountDescription: { __text: '', _lang: 'fr' }, _currencyCodeList: 'ISO_4217', _amountTypeCode: 'I-181' } },
        { Moa: { Amount: { __text: '', _currencyIdentifier: '' }, AmountDescription: { __text: '', _lang: 'fr' }, _currencyCodeList: 'ISO_4217', _amountTypeCode: 'I-180' } }
      ]
    };
  }

  private _defaultInvoiceTaxDetails(): any {
    return {
      InvoiceTaxDetails: [{
        Tax: { TaxTypeName: { __text: '', _code: '' }, TaxCategory: '', TaxDetails: { TaxRate: '', TaxRateBasis: '' } },
        AmountDetails: [{ Moa: { Amount: { __text: '', _currencyIdentifier: '' }, AmountDescription: { __text: '', _lang: 'fr' }, _currencyCodeList: 'ISO_4217', _amountTypeCode: 'I-178' } }]
      }]
    };
  }
}

import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, map } from 'rxjs';

import { InvoiceService } from '../invoice.service';
import { SignService } from '@core/services/sigLocalRest/sign.service';
import { ProfileService } from '@core/services/profiles/profile.service';
import {
  TYPE_FACT, TYPE_MONTANT, TYPE_TAXE, TYPE_PARTNER, TYPE_DATE,
  TYPE_MATRICULE, LOCATION_TYPES, CONTACT_TYPES, COM_MEANS_TYPES,
  PAYMENT_TERMS, PAYMENT_CONDITIONS, PAYMENT_MEANS, FINANCIAL_INSTIT,
  REFERENCE_TYPES, ALLOWANCE_TYPES, FTX_SUBJECT_CODES, FORMAT_DATES
} from '../teif-constants';

declare const X2JS: any;

/** Réponse backend de l'endpoint validateTeif — miroir du legacy response.data */
interface TeifValidationResponse {
  response: 'success' | 'failure' | string;
  errors?: unknown;
}

const TEIF_VERSION = '1.8.9';
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
  'TEIF.InvoiceBody.LinSection.Lin.LinTax',
  'TEIF.InvoiceBody.LinSection.Lin.LinMoa.MoaDetails',
  'TEIF.InvoiceBody.LinSection.Lin.LinDtm.DateText',
  'TEIF.InvoiceBody.InvoiceMoa.AmountDetails',
  'TEIF.InvoiceBody.InvoiceTax.InvoiceTaxDetails',
  'TEIF.InvoiceBody.InvoiceTax.InvoiceTaxDetails.AmountDetails',
  'TEIF.InvoiceBody.InvoiceAlc.AllowanceDetails',
  'TEIF.InvoiceBody.InvoiceAlc.AllowanceDetails.TaxAlc.AmountDetails',
];

@Component({
  selector: 'app-invoice-import',
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
                    <li class="active">Import Facture</li>
                  </ol>
                </div>
              </div>

              <!-- Alerts -->
              <div *ngFor="let alert of alerts()" class="alert {{alert.type}} divAlert text-center">
                {{ alert.message }}
              </div>
              <br>

              <form name="myForm" #myForm="ngForm" class="form-horizontal text-left">

                <!-- File input zone -->
                <div class="row">
                  <div class="form-group">
                    <div class="col-md-3">
                      <label>Choisir une facture XML</label>
                      <input type="file" id="file" name="file"
                        class="btn btn-default btn-sm" accept="application/xml"
                        (change)="controlXml()">
                    </div>
                    <div class="col-md-1">
                      <button type="button" class="btn btn-info btn-sm"
                        [disabled]="disValidInvoice()"
                        (click)="validateTeif()">
                        <span *ngIf="!loader().valid">Valider</span>
                        <span *ngIf="loader().valid">Validation...</span>
                      </button>
                    </div>
                    <div class="col-md-1">
                      <button type="button" class="btn btn-primary btn-sm"
                        [disabled]="disImportInvoice()"
                        (click)="importTeif()">
                        <span *ngIf="!loader().import">Importer</span>
                        <span *ngIf="loader().import">Import...</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="form-actions pull-right" *ngIf="teifImported()">
                  <button type="button" (click)="save()" class="btn btn-primary btn-sm"
                    [disabled]="disSign()">
                    <span *ngIf="!loader().sign">Signer</span>
                    <span *ngIf="loader().sign">Signature en cours...</span>
                  </button>

                  <button type="button" (click)="send()" class="btn btn-primary btn-sm"
                    [disabled]="disSend()">
                    <span *ngIf="!loader().send">Envoyer</span>
                    <span *ngIf="loader().send">Envoi en cours...</span>
                  </button>

                  <button type="button" (click)="exportInvoice()" class="btn btn-default btn-sm">
                    Exporter XML
                  </button>

                  <button *ngIf="teifSigned()" type="button" (click)="exportInvoiceSigned()"
                    class="btn btn-default btn-sm">
                    Exporter XML Signé
                  </button>

                  <button type="button" (click)="sendSignedImportedTeif()" class="btn btn-warning btn-sm">
                    Envoyer fichier signé
                  </button>

                  <button type="button" (click)="reset()" class="btn btn-warning btn-sm">
                    Initialiser
                  </button>
                </div>

                <!-- TEIF Form (same structure as invoice-add — ng-include invoice.html in legacy) -->
                <div *ngIf="teifImported()">
                  <!-- InvoiceHeader -->
                  <div class="panel panel-default">
                    <div class="panel-heading">Entête Facture</div>
                    <div class="panel-body">
                      <div class="form-group">
                        <label class="col-md-2 control-label">Matricule Expéditeur</label>
                        <div class="col-md-2">
                          <select class="form-control" [(ngModel)]="invoiceHeader.MessageSenderIdentifier._type" name="senderType">
                            <option *ngFor="let m of typeMatricule" [value]="m.id">{{m.name}}</option>
                          </select>
                        </div>
                        <div class="col-md-3">
                          <input type="text" class="form-control" [(ngModel)]="invoiceHeader.MessageSenderIdentifier.__text" name="senderText" placeholder="Valeur">
                        </div>
                      </div>

                      <!-- BGM -->
                      <div class="form-group">
                        <label class="col-md-2 control-label">N° Facture</label>
                        <div class="col-md-3">
                          <input type="text" class="form-control" [(ngModel)]="bgm.DocumentIdentifier" name="docId" required>
                        </div>
                        <label class="col-md-2 control-label">Type Facture</label>
                        <div class="col-md-3">
                          <select class="form-control" [(ngModel)]="bgm.DocumentType._code" name="docType" required>
                            <option *ngFor="let t of typeFact" [value]="t.id">{{t.name}}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- DTM section (dates) -->
                  <div class="panel panel-default">
                    <div class="panel-heading">
                      Dates
                      <button type="button" class="btn btn-xs btn-success pull-right" (click)="addDateRow()">+</button>
                    </div>
                    <div class="panel-body">
                      <div *ngFor="let d of dtm.DateText; let i = index" class="form-group">
                        <div class="col-md-3">
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
                          <input type="text" class="form-control" [(ngModel)]="d.__text" [name]="'dtmVal'+i" placeholder="Valeur date">
                        </div>
                        <div class="col-md-1">
                          <button type="button" class="btn btn-xs btn-danger" (click)="removeDateRow(i)">−</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Partners -->
                  <div class="panel panel-default" *ngFor="let p of partnerDetails.PartnerDetails; let pi = index">
                    <div class="panel-heading">Partenaire {{pi+1}} — {{p._functionCode}}</div>
                    <div class="panel-body">
                      <div class="form-group">
                        <label class="col-md-2 control-label">Type</label>
                        <div class="col-md-2">
                          <select class="form-control" [(ngModel)]="p._functionCode" [name]="'pType'+pi">
                            <option *ngFor="let t of typePartner" [value]="t.id">{{t.name}}</option>
                          </select>
                        </div>
                        <label class="col-md-2 control-label">Matricule</label>
                        <div class="col-md-2">
                          <select class="form-control" [(ngModel)]="p.Nad.PartnerIdentifier._type" [name]="'pMatType'+pi">
                            <option *ngFor="let m of typeMatricule" [value]="m.id">{{m.name}}</option>
                          </select>
                        </div>
                        <div class="col-md-2">
                          <input type="text" class="form-control" [(ngModel)]="p.Nad.PartnerIdentifier.__text" [name]="'pMatVal'+pi" placeholder="Valeur">
                        </div>
                      </div>
                      <div class="form-group">
                        <label class="col-md-2 control-label">Nom</label>
                        <div class="col-md-4">
                          <input type="text" class="form-control" [(ngModel)]="p.Nad.PartnerName.__text" [name]="'pName'+pi" placeholder="Nom partenaire">
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Articles (LinSection) -->
                  <div class="panel panel-default">
                    <div class="panel-heading">Articles</div>
                    <div class="panel-body">
                      <div *ngFor="let l of lin.Lin; let li = index" class="well well-sm">
                        <strong>Article {{li+1}}: {{l.LinImd?.ItemDescription}}</strong>
                        <button type="button" class="btn btn-xs btn-danger pull-right" (click)="removeLin(li)">−</button>
                      </div>
                      <!-- New article form (simplified - full form in invoice-add) -->
                      <div class="panel panel-info">
                        <div class="panel-heading">Nouvel article</div>
                        <div class="panel-body">
                          <div class="form-group">
                            <label class="col-md-2 control-label">Identifiant</label>
                            <div class="col-md-2"><input type="text" class="form-control" [(ngModel)]="linType.ItemIdentifier" name="linId"></div>
                            <label class="col-md-2 control-label">Description</label>
                            <div class="col-md-4"><input type="text" class="form-control" [(ngModel)]="linType.LinImd.ItemDescription" name="linDesc"></div>
                          </div>
                          <div class="form-group">
                            <label class="col-md-2 control-label">Quantité</label>
                            <div class="col-md-2"><input type="number" class="form-control" [(ngModel)]="linType.LinQty.Quantity.__text" name="linQty"></div>
                            <label class="col-md-2 control-label">Unité</label>
                            <div class="col-md-2"><input type="text" class="form-control" [(ngModel)]="linType.LinQty.Quantity._measurementUnit" name="linUnit"></div>
                          </div>
                          <button type="button" class="btn btn-success btn-sm" (click)="addLin()">Ajouter article</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Montants -->
                  <div class="panel panel-default">
                    <div class="panel-heading">
                      Montants
                      <button type="button" class="btn btn-xs btn-success pull-right" (click)="addAmountRow()">+</button>
                    </div>
                    <div class="panel-body">
                      <div *ngFor="let a of amountDetails.AmountDetails; let ai = index" class="form-group">
                        <div class="col-md-3">
                          <select class="form-control" [(ngModel)]="a.Moa._amountTypeCode" [name]="'amtType'+ai">
                            <option *ngFor="let m of typeMontant" [value]="m.id">{{m.name}}</option>
                          </select>
                        </div>
                        <div class="col-md-2">
                          <input type="number" class="form-control" [(ngModel)]="a.Moa.Amount.__text" [name]="'amtVal'+ai" placeholder="Montant">
                        </div>
                        <div class="col-md-2">
                          <select class="form-control" [(ngModel)]="a.Moa.Amount._currencyIdentifier" [name]="'amtCur'+ai">
                            <option *ngFor="let d of devise" [value]="d.id">{{d.name}}</option>
                          </select>
                        </div>
                        <div class="col-md-1">
                          <button type="button" class="btn btn-xs btn-danger" (click)="removeAmountRow(ai)">−</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Taxes -->
                  <div class="panel panel-default">
                    <div class="panel-heading">
                      Taxes
                      <button type="button" class="btn btn-xs btn-success pull-right" (click)="addTaxRow()">+</button>
                    </div>
                    <div class="panel-body">
                      <div *ngFor="let t of invoiceTaxDetails.InvoiceTaxDetails; let ti = index" class="form-group">
                        <div class="col-md-3">
                          <select class="form-control" [(ngModel)]="t.Tax.TaxTypeName._code" [name]="'taxType'+ti">
                            <option *ngFor="let tx of typeTaxe" [value]="tx.id">{{tx.name}}</option>
                          </select>
                        </div>
                        <div class="col-md-2">
                          <input type="number" class="form-control" [(ngModel)]="t.Tax.TaxDetails.TaxRate" [name]="'taxRate'+ti" placeholder="Taux">
                        </div>
                        <div class="col-md-1">
                          <button type="button" class="btn btn-xs btn-danger" (click)="removeTaxRow(ti)">−</button>
                        </div>
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
export class InvoiceImportComponent implements OnInit, OnDestroy {
  private invoiceService = inject(InvoiceService);
  private signService = inject(SignService);
  private profileService = inject(ProfileService);
  private translate = inject(TranslateService);

  // ─── Constants for template ───
  readonly typeFact = TYPE_FACT;
  readonly typeMontant = TYPE_MONTANT;
  readonly typeTaxe = TYPE_TAXE;
  readonly typePartner = TYPE_PARTNER;
  readonly typeDate = TYPE_DATE;
  readonly typeMatricule = TYPE_MATRICULE;
  readonly location = LOCATION_TYPES;
  readonly contactType = CONTACT_TYPES;
  readonly comMeansType = COM_MEANS_TYPES;
  readonly paymentTerms = PAYMENT_TERMS;
  readonly paymentCondition = PAYMENT_CONDITIONS;
  readonly paymentMeans = PAYMENT_MEANS;
  readonly financialInstit = FINANCIAL_INSTIT;
  readonly reference = REFERENCE_TYPES;
  readonly allowanceType = ALLOWANCE_TYPES;
  readonly ftxSubjectCode = FTX_SUBJECT_CODES;
  readonly formatDat = FORMAT_DATES;

  // ─── Signals ───
  alerts = signal<{ message: string; type: string }[]>([]);
  loader = signal({ save: false, sign: false, send: false, import: false, valid: false });
  disSign = signal(false);
  disSend = signal(true);
  disImportInvoice = signal(true);
  disValidInvoice = signal(false);
  teifSigned = signal(false);
  teifImported = signal(false);

  // ─── Data ───
  userInfo: any = {};
  devise: { id: string; name: string }[] = [];
  xmlDoc = '';
  xmlDocSigned = '';
  signedInvoice = false;

  // ─── TEIF form model ───
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
  showAdRef = false;

  private langSub?: Subscription;
  private deviseFr: { id: string; name: string }[] = [];
  private deviseAr: { id: string; name: string }[] = [];

  ngOnInit(): void {
    // Load devise list
    this.invoiceService.getDeviseList().subscribe(res => {
      this.deviseFr = res.map((d: any) => ({ id: d.id, name: d.libDevFr }));
      this.deviseAr = res.map((d: any) => ({ id: d.id, name: d.libDevAr }));
      this._applyDeviseLanguage(this.translate.currentLang);
    });

    this.langSub = this.translate.onLangChange.subscribe(e => {
      this._applyDeviseLanguage(e.lang);
    });

    // Load user info
    this.profileService.getProfileInfo().subscribe((info: any) => {
      this.userInfo = info;
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  // ─── File control ───
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
    this._readFileText(file, data => {
      this.invoiceService.validateTeif(data, this.signedInvoice, '1.8.9').pipe(
        map(res => res as TeifValidationResponse)
      ).subscribe({
        next: (res: TeifValidationResponse) => {
          this.clearAlerts();
          this.loader.update(l => ({ ...l, valid: false }));
          if (res.response === 'success') {
            this.addAlert('Document Valide', 'alert-info');
            this.disImportInvoice.set(false);
            this.disValidInvoice.set(false);
          } else {
            this.addAlert('Document invalide', 'alert-danger');
            if (res.errors) this.addAlert(JSON.stringify(res.errors), 'alert-danger');
          }
        },
        error: err => {
          this.loader.update(l => ({ ...l, valid: false }));
          this.addAlert('Echec de validation la facture', 'alert-danger');
          if (err.error?.errors) this.addAlert(JSON.stringify(err.error.errors), 'alert-danger');
        }
      });
    });
  }

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

  // ─── Sign (build TEIF → SignService) ───
  save(): void {
    if (this.lin.Lin.length === 0) {
      this.addAlert('Saisir vos articles!', 'alert-warning');
      return;
    }
    this.clearAlerts();
    this.loader.update(l => ({ ...l, sign: true }));

    const xml = this._buildTeifXml();
    const dataJson = [{ idfacture: 1, contenuxml: xml }];

    this.signService.sign(dataJson).subscribe({
      next: (message: any) => {
        const listDataSig = message.listDataSig;
        if (listDataSig?.length > 0) {
          this.xmlDocSigned = listDataSig[0].contenuxml;
          this.teifSigned.set(true);
          this.loader.update(l => ({ ...l, sign: false }));
          this.addAlert('Signature Realisee avec success, veuillez envoyer la facture!', 'alert-info');
          this.disSign.set(true);
          this.disSend.set(false);
        } else {
          this.addAlert('Echec Signature: ' + message.details, 'alert-warning');
          this.loader.update(l => ({ ...l, sign: false }));
        }
      },
      error: () => {
        this.loader.update(l => ({ ...l, sign: false }));
        this.addAlert('Erreur de connexion au service de signature local: vérifier que le service est bien installé et fonctionnel', 'alert-warning');
      }
    });
  }

  send(): void {
    this.loader.update(l => ({ ...l, send: true }));
    this.invoiceService.generateTeif(this.xmlDocSigned).subscribe({
      next: (res: any) => {
        this.disSend.set(true);
        this.clearAlerts();
        this.loader.update(l => ({ ...l, send: false }));
        this.addAlert(JSON.stringify(res.detail), 'alert-info');
      },
      error: () => {
        this.loader.update(l => ({ ...l, send: false }));
        this.clearAlerts();
        this.addAlert('Echec Envoi de la facture', 'alert-warning');
      }
    });
  }

  exportInvoice(): void {
    const xml = '<?xml version="1.0" encoding="UTF-8"?>' + this._buildTeifXml().replace(/&quot;/g, '"');
    this.invoiceService.downloadXml(xml, this.bgm.DocumentIdentifier + '.xml');
  }

  exportInvoiceSigned(): void {
    this.invoiceService.downloadXml(this.xmlDocSigned, 'signed-' + this.bgm.DocumentIdentifier + '.xml');
  }

  sendSignedImportedTeif(): void {
    const file = this._getFile();
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = (e: any) => {
      const xmlText = e.target.result as string;
      this.loader.update(l => ({ ...l, send: true }));
      this.invoiceService.generateTeif(xmlText).subscribe({
        next: (res: any) => {
          this.disSend.set(true);
          this.clearAlerts();
          this.loader.update(l => ({ ...l, send: false }));
          this.addAlert(JSON.stringify(res.detail), 'alert-info');
        },
        error: () => {
          this.loader.update(l => ({ ...l, send: false }));
          this.clearAlerts();
          this.addAlert('Echec Envoi de la facture', 'alert-warning');
        }
      });
    };
  }

  reset(): void {
    this.clearAlerts();
    this.teifSigned.set(false);
    this.teifImported.set(false);
    this.disImportInvoice.set(true);
    this.disSign.set(false);
    this.disSend.set(true);
    this.xmlDocSigned = '';
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
    this.showAdRef = false;
  }

  // ─── Lin (articles) helpers ───
  addLin(): void {
    this.lin.Lin.push({ ...this.linType });
    this.linType = this._defaultLinType();
  }

  removeLin(index: number): void {
    this.lin.Lin.splice(index, 1);
  }

  // ─── Date rows ───
  addDateRow(): void {
    this.dtm.DateText.push({ _functionCode: '', _format: '', __text: '' });
  }
  removeDateRow(i: number): void {
    this.dtm.DateText.splice(i, 1);
  }

  // ─── Amount rows ───
  addAmountRow(): void {
    this.amountDetails.AmountDetails.push({
      Moa: { Amount: { __text: '', _currencyIdentifier: 'TND' }, AmountDescription: { __text: '', _lang: 'fr' }, _currencyCodeList: 'ISO_4217', _amountTypeCode: '' }
    });
  }
  removeAmountRow(i: number): void {
    this.amountDetails.AmountDetails.splice(i, 1);
  }

  // ─── Tax rows ───
  addTaxRow(): void {
    this.invoiceTaxDetails.InvoiceTaxDetails.push({
      Tax: { TaxTypeName: { __text: '', _code: '' }, TaxCategory: '', TaxDetails: { TaxRate: '', TaxRateBasis: '' } },
      AmountDetails: [{ Moa: { Amount: { __text: '', _currencyIdentifier: 'TND' }, AmountDescription: { __text: '', _lang: 'fr' }, _currencyCodeList: 'ISO_4217', _amountTypeCode: 'I-178' } }]
    });
  }
  removeTaxRow(i: number): void {
    this.invoiceTaxDetails.InvoiceTaxDetails.splice(i, 1);
  }

  // ─── Private helpers ───
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

  private _readFileText(file: File, cb: (data: string) => void): void {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = (e: any) => cb(e.target.result as string);
  }

  addAlert(message: string, type: string): void {
    this.alerts.update(a => [...a, { message, type }]);
  }

  clearAlerts(): void {
    this.alerts.set([]);
  }

  private _buildTeifXml(): string {
    const teif: any = {
      TEIF: {
        _version: TEIF_VERSION,
        _controlingAgency: 'Tunisie TradeNet',
        InvoiceHeader: {
          ...this.invoiceHeader,
          MessageRecieverIdentifier: {
            _type: this.partnerDetails.PartnerDetails[1]?.Nad.PartnerIdentifier._type ?? '',
            __text: this.partnerDetails.PartnerDetails[1]?.Nad.PartnerIdentifier.__text ?? ''
          }
        },
        InvoiceBody: {
          Bgm: this.bgm,
          Dtm: this.dtm,
          PartnerSection: this._cleanPartners(),
          LinSection: this.lin,
          InvoiceMoa: this._cleanAmounts(),
          InvoiceTax: this.invoiceTaxDetails,
        }
      }
    };

    if (this.pytSection.PytSectionDetails.length > 0) {
      teif.TEIF.InvoiceBody.PytSection = this.pytSection;
    }
    if (this.ftx.FreeTextDetail.length > 0) {
      teif.TEIF.InvoiceBody.Ftx = this.ftx;
    }
    if (this.specialConditions.length > 0) {
      teif.TEIF.InvoiceBody.SpecialConditions = this.specialConditions;
    }
    if (this.invoiceAlc.AllowanceDetails.length > 0) {
      teif.TEIF.InvoiceBody.InvoiceAlc = this.invoiceAlc;
    }
    if (this.adRef?.AdditionnalDocumentIdentifier) {
      teif.TEIF.AdditionnalDocuments = {
        AdditionnalDocumentIdentifier: this.adRef.AdditionnalDocumentIdentifier,
        AdditionnalDocumentName: this.adRef.AdditionnalDocumentName,
        AdditionnalDocumentDate: this.adRef.AdditionnalDocumentDate,
      };
    }

    const x2js = new X2JS();
    return x2js.json2xml_str(teif);
  }

  private _cleanPartners(): any {
    const details = this.partnerDetails.PartnerDetails.map((p: any) => {
      const cleaned = { ...p };
      if (cleaned.Nad.PartnerAdresses?.length === 0) delete cleaned.Nad.PartnerAdresses;
      if (cleaned.Loc?.length === 0) delete cleaned.Loc;
      if (cleaned.CtaSection?.length === 0) delete cleaned.CtaSection;
      if (cleaned.RffSection?.length === 0) delete cleaned.RffSection;
      else if (cleaned.RffSection) {
        cleaned.RffSection = cleaned.RffSection.map((r: any) => {
          const cr = { ...r };
          if (cr.ReferenceDate?.DateText?.length === 0) delete cr.ReferenceDate;
          return cr;
        });
      }
      return cleaned;
    });
    return { PartnerDetails: details };
  }

  private _cleanAmounts(): any {
    const details = this.amountDetails.AmountDetails.map((a: any) => {
      const moa = a.Moa;
      if (moa.AmountDescription !== undefined) {
        return { Moa: { Amount: { __text: moa.Amount.__text, _currencyIdentifier: moa.Amount._currencyIdentifier }, AmountDescription: { __text: moa.AmountDescription.__text, _lang: 'fr' }, _currencyCodeList: 'ISO_4217', _amountTypeCode: moa._amountTypeCode } };
      }
      return { Moa: { Amount: { __text: moa.Amount.__text, _currencyIdentifier: moa.Amount._currencyIdentifier }, _currencyCodeList: 'ISO_4217', _amountTypeCode: moa._amountTypeCode } };
    });
    return { AmountDetails: details };
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
      LinTax: [{ TaxTypeName: { _code: '', __text: '' }, TaxCategory: '', TaxDetails: { TaxRate: '', TaxRateBasis: '' } }],
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
        { Moa: { Amount: { __text: '', _currencyIdentifier: 'TND' }, AmountDescription: { __text: '', _lang: 'fr' }, _currencyCodeList: 'ISO_4217', _amountTypeCode: 'I-176' } },
        { Moa: { Amount: { __text: '', _currencyIdentifier: 'TND' }, AmountDescription: { __text: '', _lang: 'fr' }, _currencyCodeList: 'ISO_4217', _amountTypeCode: 'I-181' } },
        { Moa: { Amount: { __text: '', _currencyIdentifier: 'TND' }, AmountDescription: { __text: '', _lang: 'fr' }, _currencyCodeList: 'ISO_4217', _amountTypeCode: 'I-180' } }
      ]
    };
  }

  private _defaultInvoiceTaxDetails(): any {
    return {
      InvoiceTaxDetails: [{
        Tax: { TaxTypeName: { __text: '', _code: '' }, TaxCategory: '', TaxDetails: { TaxRate: '', TaxRateBasis: '' } },
        AmountDetails: [{ Moa: { Amount: { __text: '', _currencyIdentifier: 'TND' }, AmountDescription: { __text: '', _lang: 'fr' }, _currencyCodeList: 'ISO_4217', _amountTypeCode: 'I-178' } }]
      }]
    };
  }
}
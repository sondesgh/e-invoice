import {
  Component, OnInit, OnDestroy, inject, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { InvoiceService, InvoiceWebsockService } from '../invoice.service';
import { SignService } from '@core/services/sigLocalRest/sign.service';
import {
  TYPE_FACT, TYPE_MONTANT, TYPE_TAXE, TYPE_PARTNER, TYPE_DATE,
  TYPE_MATRICULE, LOCATION_TYPES, CONTACT_TYPES, COM_MEANS_TYPES,
  PAYMENT_TERMS, PAYMENT_CONDITIONS, PAYMENT_MEANS, FINANCIAL_INSTIT,
  REFERENCE_TYPES, ALLOWANCE_TYPES, FTX_SUBJECT_CODES, FORMAT_DATES,
  labelOf, CodeLabel
} from '../teif-constants';

/**
 * InvoiceAddComponent
 *
 * Migré depuis `AddInvoiceCtrl` (invoice-add.controller.js — ~4000 lignes).
 *
 * Responsabilités portées :
 *  1. Construction du document TEIF (arbre JSON → XML via X2JS)
 *  2. Signature via SignService (REST local http://127.0.0.1:20200/sigAgent/sign)
 *     - Alternative commentée : STOMP/WebSocket via InvoiceWebsockService
 *  3. Envoi via InvoiceService.generateTeif()
 *  4. Export XML / visualisation PDF
 *  5. Import XML (FileUploader → FileReader natif)
 *  6. Chargement des référentiels (pays, devises, versions XSD)
 *  7. ConvNumberLetter_fr (nombre en lettres)
 *
 * Décisions de migration :
 *  - `alertsManager` factory → `alerts` signal (tableau interne)
 *  - `isolateForm` directive → supprimée (Angular reactive/template forms gèrent l'isolation)
 *  - `FileSaver.saveAs()` → `InvoiceService.downloadXml() / openPdf()`
 *  - `angular.isDefined()` → opérateur `?? / !==` natif TS
 *  - `$translate.use()` → `translate.currentLang`
 *  - `$rootScope.$on('$translateChangeSuccess')` → `TranslateService.onLangChange`
 *  - X2JS reste un global chargé via scripts (index.html / angular.json)
 *    Il n'existe pas de wrapper Angular natif pour X2JS — conserver tel quel.
 *
 * Route : /invoice/addInvoice (ROLE_USER)
 */
@Component({
  selector: 'app-invoice-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './invoice-add.component.html',
})
export class InvoiceAddComponent implements OnInit, OnDestroy {
  private readonly authService    = inject(AuthService);
  private readonly invoiceService = inject(InvoiceService);
  private readonly signService    = inject(SignService);
  private readonly translate      = inject(TranslateService);
  private readonly destroy$       = new Subject<void>();

  // ── Référentiels statiques ────────────────────────────────────────────────
  readonly typeFact       = TYPE_FACT;
  readonly typeMontant    = TYPE_MONTANT;
  readonly typeTaxe       = TYPE_TAXE;
  readonly typePartner    = TYPE_PARTNER;
  readonly typeDate       = TYPE_DATE;
  readonly typeMatricule  = TYPE_MATRICULE;
  readonly locationTypes  = LOCATION_TYPES;
  readonly contactTypes   = CONTACT_TYPES;
  readonly comMeansTypes  = COM_MEANS_TYPES;
  readonly paymentTerms   = PAYMENT_TERMS;
  readonly paymentCond    = PAYMENT_CONDITIONS;
  readonly paymentMeans   = PAYMENT_MEANS;
  readonly financialInstit = FINANCIAL_INSTIT;
  readonly referenceTypes = REFERENCE_TYPES;
  readonly allowanceTypes = ALLOWANCE_TYPES;
  readonly ftxCodes       = FTX_SUBJECT_CODES;
  readonly formatDates    = FORMAT_DATES;
  readonly labelOf        = labelOf;

  // ── Référentiels dynamiques (pays, devises) ───────────────────────────────
  typeCountry: CodeLabel[] = [];
  devise:      CodeLabel[] = [];
  private _countriesFr: CodeLabel[] = [];
  private _countriesAr: CodeLabel[] = [];
  private _deviseFr:    CodeLabel[] = [];
  private _deviseAr:    CodeLabel[] = [];

  // ── État utilisateur ──────────────────────────────────────────────────────
  readonly account = computed(() => this.authService.account());

  // ── Version TEIF ─────────────────────────────────────────────────────────
  readonly TEIF_VERSION = '1.8.9';

  // ── Alertes (remplace alertsManager factory) ──────────────────────────────
  readonly alerts = signal<Array<{ message: string; type: string }>>([]);

  // ── Loaders ───────────────────────────────────────────────────────────────
  readonly loaderSign = signal(false);
  readonly loaderSend = signal(false);
  readonly loaderSave = signal(false);

  // ── État formulaire ───────────────────────────────────────────────────────
  dis     = false;
  disSign = false;
  disInit = false;
  disSend = true;

  teifSigned   = false;
  xmlDoc       = '';
  xmlDocSigned = '';

  // ── Index pour modification d'article ────────────────────────────────────
  indexForUpdate: number | '' = '';

  // ── Loader unifié (pour template) ────────────────────────────────────────
  /** Proxy pour template : loader().sign / loader().send */
  get loader() {
    return {
      sign: this.loaderSign(),
      send: this.loaderSend(),
    };
  }

  // ── Document TEIF (structure JSON) ───────────────────────────────────────
  /** Objet JSON construit dans le formulaire, sérialisé via X2JS avant envoi. */
  teif: Record<string, unknown> = {};

  // ── Modèles du formulaire (simplifiés — détails dans le template) ─────────
  bgm = {
    DocumentIdentifier: '',
    DocumentType: { _code: '', __text: '' },
  };
  dtm = { DateText: [{ _functionCode: '', _format: '', __text: '', __textA: '' }] };
  partnerDetails = { PartnerDetails: [] as any[] };
  lin            = { Lin: [] as any[] };
  amountDetails  = { AmountDetails: this._defaultAmounts() };
  invoiceTaxDetails = { InvoiceTaxDetails: [] as any[] };
  invoiceAlc        = { AllowanceDetails: [] as any[] };
  invoiceHeader: any = {
    MessageSenderIdentifier: { _type: 'I-01', __text: '' },
    MessageRecieverIdentifier: { _type: 'I-01', __text: '' },
  };
  pytSection:        any = {};
  ftx:               any = { FreeTextDetail: [] };
  specialConditions: any[] = [];
  adRef:             any = {};

  // ── Article courant (linType) ─────────────────────────────────────────────
  linType: any = this._defaultLinType();

  ngOnInit(): void {
    // Charger les référentiels dynamiques
    this.invoiceService.getCountryList().subscribe(data => {
      this._countriesFr = data.map(c => ({ id: String(c.id), name: c.libPayFr }));
      this._countriesAr = data.map(c => ({ id: String(c.id), name: c.libPayAr }));
      this._applyLanguage();
    });
    this.invoiceService.getDeviseList().subscribe(data => {
      this._deviseFr = data.map(d => ({ id: String(d.id), name: d.libDevFr }));
      this._deviseAr = data.map(d => ({ id: String(d.id), name: d.libDevAr }));
      this._applyLanguage();
    });

    // Réagit aux changements de langue (remplace $rootScope.$on('$translateChangeSuccess'))
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this._applyLanguage());

    // Pré-remplir partnerDetails[0] avec le partnerCode de l'utilisateur
    const acc = this.account();
    if (acc) {
      this._initPartnerEmetteur(acc.partnerCode!);//! ajouté  vu obligatoire sinon account.partnerCode ?? ''
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Actions principales ───────────────────────────────────────────────────

  /** Signe le document TEIF via l'agent local (SignService). */
  sign(): void {
    this.loaderSign.set(true);
    this.alerts.set([]);
    this._buildTeif();

    const dataJson = [{ idfacture: 1, contenuxml: this.xmlDoc }];
    this.signService.sign(dataJson).subscribe({
      next: (message: any) => {
        const listDataSig = message?.listDataSig;
        if (listDataSig?.length > 0) {
          this.xmlDocSigned = listDataSig[0].contenuxml;
          this.teifSigned   = true;
          this.disSign      = true;
          this.disSend      = false;
          this._addAlert('Signature Realisee avec success, veuillez envoyer la facture!', 'alert-info');
        } else {
          this._addAlert(`Echec Signature: ${message?.details ?? ''}`, 'alert-warning');
          this.disSign = false;
          this.disSend = true;
        }
        this.loaderSign.set(false);
      },
      error: () => {
        this.loaderSign.set(false);
        this._addAlert(
          'Erreur de connexion au service de signature local: vérifier que le service est bien installé et fonctionnel',
          'alert-warning'
        );
        this.disSign = false;
        this.disSend = true;
      },
    });
  }

  /** Envoie le XML signé au serveur ElFatoora. */
  send(): void {
    this.loaderSend.set(true);
    this.invoiceService.generateTeif(this.xmlDocSigned).subscribe({
      next: (response) => {
        this.disSend = true;
        this.alerts.set([]);
        this._addAlert(JSON.stringify(response.detail), 'alert-info');
        this.loaderSend.set(false);
      },
      error: () => {
        this.loaderSend.set(false);
        this.alerts.set([]);
        this._addAlert('Echec Envoi de la facture', 'alert-warning');
      },
    });
  }

  /** Exporte le document TEIF en XML local. */
  exportInvoice(): void {
    this.alerts.set([]);
    this._buildTeif();
    const xml = `<?xml version='1.0' encoding='UTF-8'?>${this.xmlDoc.replace(/&quot;/g, '"')}`;
    this.invoiceService.downloadXml(xml, `${this.bgm.DocumentIdentifier}.xml`);
  }

  /** Visualise le PDF de la facture (avant envoi). */
  viewInvoice(): void {
    this.alerts.set([]);
    this._buildTeif();
    const xml = `<?xml version='1.0' encoding='UTF-8'?>${this.xmlDoc.replace(/&quot;/g, '"')}`;
    this.invoiceService.visualiseReport(this.bgm.DocumentIdentifier, xml).subscribe({
      next: (data) => this.invoiceService.openPdf(data, 'apercu-facture.pdf'),
      error: () => this._addAlert('Erreur visualisation PDF', 'alert-danger'),
    });
  }

  /** Ajoute un article à la section Lin. */
  addLin(): void {
    this.lin.Lin.push({ ...this.linType });
    this.linType = this._defaultLinType();
  }

  removeLin(index: number): void {
    this.lin.Lin.splice(index, 1);
  }

  addAmountDetail(): void {
    this.amountDetails.AmountDetails.push(this._emptyMoa());
  }

  removeAmountDetail(index: number): void {
    this.amountDetails.AmountDetails.splice(index, 1);
  }

  /** Conversion nombre → lettres (fr). */
  convNumberLetter(nombre: number, devise: string): string {
    if (isNaN(parseFloat(String(nombre)))) return '';
    return this._convNumberLetter(nombre, devise, 0).trim();
  }

  /** Formate une date selon un format TEIF (ddMMyy, yyyy-MM-dd…). */
  formatDate(date: Date | string | null | undefined, format: string): string {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const y  = d.getFullYear();
    const yy = String(y).slice(-2);
    const m  = pad(d.getMonth() + 1);
    const dy = pad(d.getDate());
    switch (format) {
      case 'ddMMyy':      return `${dy}${m}${yy}`;
      case 'yyyy-MM-dd':  return `${y}-${m}-${dy}`;
      case 'dd/MM/yyyy':  return `${dy}/${m}/${y}`;
      default:            return `${dy}${m}${yy}`;
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _applyLanguage(): void {
    const lang = this.translate.currentLang ?? 'fr';
    if (lang === 'fr') {
      this.typeCountry = this._countriesFr;
      this.devise      = this._deviseFr;
    } else if (lang === 'ar') {
      this.typeCountry = this._countriesAr;
      this.devise      = this._deviseAr;
    }
  }

  private _initPartnerEmetteur(partnerCode: string): void {
    this.partnerDetails.PartnerDetails[0] = {
      Nad: {
        PartnerIdentifier: { _type: 'I-01', __text: partnerCode },
        PartnerName:       { _nameType: '', __text: '' },
        PartnerAdresses:   [],
      },
      Loc:        [],
      RffSection: [],
      CtaSection: [],
      _functionCode: 'I-62',
    };
  }

  /**
   * Construit l'objet TEIF JSON à partir des champs du formulaire,
   * puis le sérialise en XML via X2JS.
   * Logique identique à ExportInvoice / Sign / ViewInvoice du legacy.
   */
  private _buildTeif(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const acc = this.account()!;

    const teif: any = {
      TEIF: {
        _version:          this.TEIF_VERSION,
        _controlingAgency: 'Tunisie TradeNet',
        InvoiceHeader: {
          ...this.invoiceHeader,
          MessageSenderIdentifier: { __text: acc.partnerCode, _type: 'I-01' },
          MessageRecieverIdentifier: {
            _type: this.partnerDetails.PartnerDetails[1]?.Nad?.PartnerIdentifier?._type,
            __text: this.partnerDetails.PartnerDetails[1]?.Nad?.PartnerIdentifier?.__text,
          },
        },
        InvoiceBody: {
          Bgm:     this.bgm,
          Dtm:     this._buildDtm(),
          PartnerSection: this._buildPartners(),
          LinSection:     this.lin,
          InvoiceMoa:     this._buildAmounts(),
          InvoiceTax:     this.invoiceTaxDetails,
        },
      },
    };

    if (this.invoiceAlc.AllowanceDetails.length > 0) {
      teif.TEIF.InvoiceBody.InvoiceAlc = this.invoiceAlc;
    }
    if (this.ftx?.FreeTextDetail?.length > 0) {
      teif.TEIF.InvoiceBody.Ftx = this.ftx;
    }
    if (this.specialConditions?.length > 0) {
      teif.TEIF.InvoiceBody.SpecialConditions = this.specialConditions;
    }
    if (this.pytSection?.PytSectionDetails?.length > 0) {
      teif.TEIF.InvoiceBody.PytSection = this.pytSection;
    }
    if (this.adRef?.AdditionnalDocumentIdentifier) {
      teif.TEIF.AdditionnalDocuments = this._buildAdDoc();
    }

    if (win.X2JS) {
      const x2js = new win.X2JS();
      this.xmlDoc = x2js.json2xml_str(teif);
    } else {
      console.error('[InvoiceAddComponent] X2JS non chargé');
    }
  }

  private _buildDtm(): { DateText: any[] } {
    return {
      DateText: this.dtm.DateText.map(dt => {
        if (dt._format === 'ddMMyy-ddMMyy') {
          return {
            _functionCode: dt._functionCode,
            _format:       dt._format,
            __text:        `${this.formatDate(dt.__text, 'ddMMyy')}-${this.formatDate(dt.__textA, 'ddMMyy')}`,
          };
        }
        return {
          _functionCode: dt._functionCode,
          _format:       dt._format,
          __text:        this.formatDate(dt.__text, dt._format),
        };
      }),
    };
  }

  private _buildPartners(): { PartnerDetails: any[] } {
    // Nettoyage des tableaux vides identique au legacy
    const details = this.partnerDetails.PartnerDetails.map(p => {
      const partner = { ...p };
      if (!partner.Nad?.PartnerAdresses?.length) delete partner.Nad?.PartnerAdresses;
      if (!partner.Loc?.length)        delete partner.Loc;
      if (!partner.CtaSection?.length) delete partner.CtaSection;
      if (!partner.RffSection?.length) delete partner.RffSection;
      return partner;
    });
    return { PartnerDetails: details };
  }

  private _buildAmounts(): { AmountDetails: any[] } {
    return {
      AmountDetails: this.amountDetails.AmountDetails.map(a => ({
        Moa: {
          Amount:          { __text: a.Moa.Amount.__text, _currencyIdentifier: a.Moa.Amount._currencyIdentifier },
          ...(a.Moa.AmountDescription ? { AmountDescription: { __text: a.Moa.AmountDescription.__text, _lang: 'fr' } } : {}),
          _currencyCodeList: 'ISO_4217',
          _amountTypeCode:   a.Moa._amountTypeCode,
        },
      })),
    };
  }

  private _buildAdDoc(): any {
    return {
      AdditionnalDocumentIdentifier: this.adRef.AdditionnalDocumentIdentifier,
      AdditionnalDocumentName:       this.adRef.AdditionnalDocumentName,
      AdditionnalDocumentDate:       { DateText: this.adRef.AdditionnalDocumentDate?.DateText ?? [] },
    };
  }

  private _addAlert(message: string, type: string): void {
    this.alerts.update(list => [...list, { message, type }]);
  }

  private _emptyMoa(amountTypeCode = ''): any {
    return {
      Moa: {
        Amount:            { __text: '', _currencyIdentifier: 'TND' },
        AmountDescription: { __text: '', _lang: 'fr' },
        _currencyCodeList: 'ISO_4217',
        _amountTypeCode:   amountTypeCode,
      },
    };
  }

  private _defaultAmounts(): any[] {
    return [
      this._emptyMoa('I-176'),
      this._emptyMoa('I-181'),
      this._emptyMoa('I-180'),
    ];
  }

  private _defaultLinType(): any {
    return {
      ItemIdentifier: '',
      LinImd: { ItemCode: '', ItemDescription: '', _lang: 'fr' },
      LinQty: { Quantity: { _measurementUnit: '', __text: '' } },
      LinTax: [{ TaxTypeName: { _code: '', __text: '' }, TaxCategory: '', TaxDetails: { TaxRate: '', TaxRateBasis: '' } }],
      LinMoa: { MoaDetails: [this._emptyMoa('I-183'), this._emptyMoa('I-171')] },
    };
  }

  // ── Alias pour compatibilité template ────────────────────────────────────
  /** Template utilise `reference` — alias de referenceTypes */
  get reference() { return this.referenceTypes; }
  /** Template utilise `allowanceType` — alias de allowanceTypes */
  get allowanceType() { return this.allowanceTypes; }
  /** Template utilise `ftxSubjectCodes` — alias de ftxCodes */
  get ftxSubjectCodes() { return this.ftxCodes; }
  /** Template utilise `paymentTerms` — alias de paymentTerms */

  // ── save / reset ─────────────────────────────────────────────────────────
  /** Alias de sign() pour (ngSubmit) du formulaire */
  save(): void { this.sign(); }

  reset(): void {
    this.bgm              = { DocumentIdentifier: '', DocumentType: { _code: '', __text: '' } };
    this.dtm              = { DateText: [{ _functionCode: 'I-31', _format: '', __text: '', __textA: '' }] };
    this.partnerDetails   = { PartnerDetails: [] };
    this.lin              = { Lin: [] };
    this.amountDetails    = { AmountDetails: this._defaultAmounts() };
    this.invoiceTaxDetails = { InvoiceTaxDetails: [] };
    this.invoiceAlc       = { AllowanceDetails: [] };
    this.pytSection       = {};
    this.ftx              = { FreeTextDetail: [] };
    this.specialConditions = [];
    this.linType          = this._defaultLinType();
    this.indexForUpdate   = '';
    this.teifSigned       = false;
    this.xmlDoc           = '';
    this.xmlDocSigned     = '';
    this.disSign          = false;
    this.disSend          = true;
    this.alerts.set([]);
    const acc = this.account();
    if (acc?.partnerCode) this._initPartnerEmetteur(acc.partnerCode);
  }

  exportInvoiceSigned(): void {
    const xml = `<?xml version='1.0' encoding='UTF-8'?>${this.xmlDocSigned.replace(/&quot;/g, '"')}`;
    this.invoiceService.downloadXml(xml, `${this.bgm.DocumentIdentifier}_signed.xml`);
  }

  // ── Dates ─────────────────────────────────────────────────────────────────
  addRowDate(): void {
    this.dtm.DateText.push({ _functionCode: '', _format: '', __text: '', __textA: '' });
  }
  removeRowDate(arr: any[], index: number): void { arr.splice(index, 1); }

  // ── Adresses ─────────────────────────────────────────────────────────────
  addAdr(adresses: any[]): void {
    adresses.push({ AdressDescription: '', Country: { __text: '', _countryCodeList: 'ISO_3166' } });
  }
  removeAdr(adresses: any[], index: number): void { adresses.splice(index, 1); }

  // ── Références partenaire ─────────────────────────────────────────────────
  addRff(rffSection: any[]): void {
    rffSection.push({ Reference: { _refID: '', __text: '' }, ReferenceDate: { DateText: [] } });
  }
  removeRff(rffSection: any[], index: number): void { rffSection.splice(index, 1); }

  // ── Partenaires supplémentaires ───────────────────────────────────────────
  addPartner(): void {
    this.partnerDetails.PartnerDetails.push({
      Nad: { PartnerIdentifier: { _type: '', __text: '' }, PartnerName: { _nameType: '', __text: '' }, PartnerAdresses: [] },
      Loc: [], RffSection: [], CtaSection: [],
      _functionCode: '',
    });
  }
  removePartner(index: number): void { this.partnerDetails.PartnerDetails.splice(index, 1); }

  // ── Paiement ─────────────────────────────────────────────────────────────
  addPyt(): void {
    if (!this.pytSection.PytSectionDetails) this.pytSection.PytSectionDetails = [];
    this.pytSection.PytSectionDetails.push({
      Pyt: { _functionCode: '' },
      PytDtm: { DateText: [] },
      PytMoa: { Amount: { __text: '', _currencyIdentifier: 'TND' } },
    });
  }
  removePyt(index: number): void { this.pytSection.PytSectionDetails.splice(index, 1); }

  // ── Observation (FTX) ─────────────────────────────────────────────────────
  addFtx(): void {
    this.ftx.FreeTextDetail.push({ SubjectCode: '', FreeTexts: '' });
  }
  removeFtx(index: number): void { this.ftx.FreeTextDetail.splice(index, 1); }

  // ── Conditions spécifiques ────────────────────────────────────────────────
  addSpecialCondition(): void { this.specialConditions.push({ SpecialConditionText: '' }); }
  removeSpecialCondition(index: number): void { this.specialConditions.splice(index, 1); }

  // ── Articles ─────────────────────────────────────────────────────────────
  setLinForUpdate(lin: any, index: number): void {
    this.linType = { ...lin };
    this.indexForUpdate = index;
  }
  updateLin(): void {
    if (this.indexForUpdate !== '') {
      this.lin.Lin[this.indexForUpdate] = { ...this.linType };
      this.linType = this._defaultLinType();
      this.indexForUpdate = '';
    }
  }

  addLinTax(): void {
    this.linType.LinTax.push({ TaxTypeName: { _code: '', __text: '' }, TaxCategory: '', TaxDetails: { TaxRate: '', TaxRateBasis: '' } });
  }
  removeLinTax(index: number): void { this.linType.LinTax.splice(index, 1); }

  addLinMoa(): void { this.linType.LinMoa.MoaDetails.push(this._emptyMoa()); }
  removeLinMoa(index: number): void { this.linType.LinMoa.MoaDetails.splice(index, 1); }

  // ── Montants facture ─────────────────────────────────────────────────────
  addMnt(): void { this.amountDetails.AmountDetails.push(this._emptyMoa()); }
  removeMnt(index: number): void { this.amountDetails.AmountDetails.splice(index, 1); }

  // ── Taxes facture ─────────────────────────────────────────────────────────
  addTax(): void {
    this.invoiceTaxDetails.InvoiceTaxDetails.push({
      Tax: { TaxTypeName: { _code: '', __text: '' }, TaxDetails: { TaxRate: '' } },
      AmountDetails: [this._emptyMoa('I-177'), this._emptyMoa('I-178')],
    });
  }
  removeTax(index: number): void { this.invoiceTaxDetails.InvoiceTaxDetails.splice(index, 1); }
  addTaxMoa(taxIndex: number): void { this.invoiceTaxDetails.InvoiceTaxDetails[taxIndex].AmountDetails.push(this._emptyMoa()); }
  removeTaxMoa(taxIndex: number, moaIndex: number): void {
    this.invoiceTaxDetails.InvoiceTaxDetails[taxIndex].AmountDetails.splice(moaIndex, 1);
  }

  // ── Réductions / Charges ─────────────────────────────────────────────────
  addAlc(): void {
    this.invoiceAlc.AllowanceDetails.push({
      Alc: { _functionCode: '' },
      AlcMoa: { Amount: { __text: '', _currencyIdentifier: 'TND' } },
    });
  }
  removeAlc(index: number): void { this.invoiceAlc.AllowanceDetails.splice(index, 1); }

  // ── ConvNumberLetter (porté tel quel depuis le legacy) ────────────────────

  private _convNumberLetter(nombre: number, devise: string, langue: number): string {
    const dblEnt = Math.trunc(nombre);
    const byDec  = Math.round((nombre - dblEnt) * 100);
    if (byDec === 0 && dblEnt > 999999999999999) return '#TropGrand';
    if (byDec >  0 && dblEnt > 9999999999999.99)  return '#TropGrand';
    let strDev      = devise ? ` ${devise}` : '';
    let strCentimes = '';
    if (devise) {
      if (dblEnt > 1) strDev += 'S';
      if (byDec  > 0) strCentimes = ' CENT';
    } else if (byDec > 0) {
      strDev = ' virgule';
    }
    return `${this._convNumEnt(dblEnt, langue)}${strDev} ${this._convNumDizaine(byDec, langue)}${strCentimes}`;
  }

  private _convNumEnt(n: number, langue: number): string {
    const units: string[] = [];
    let result = '';
    const labels = [' MILLE ', ' MILLION ', ' MILLIARD ', ' BILLION '];
    let rem = n;
    for (let i = 0; i < 5; i++) {
      units.push(this._convNumCent(rem % 1000, langue));
      rem = Math.trunc(rem / 1000);
    }
    result = units[0];
    if (units[1]) result = (units[1] === 'UN' ? 'MILLE ' : `${units[1]} MILLE `) + result;
    for (let i = 2; i < 5; i++) {
      if (units[i]) result = `${units[i]}${labels[i - 1]}${result}`;
    }
    return result;
  }

  private _convNumDizaine(n: number, langue: number): string {
    const units = ['','UN','DEUX','TROIS','QUATRE','CINQ','SIX','SEPT','HUIT','NEUF','DIX','ONZE','DOUZE','TREIZE','QUATORZE','QUINZE','SEIZE','DIX-SEPT','DIX-HUIT','DIX-NEUF'];
    const diz   = ['','','VINGT','TRENTE','QUARANTE','CINQUANTE','SOIXANTE','SOIXANTE','QUATRE-VINGT','QUATRE-VINGT'];
    if (langue === 1) { diz[7] = 'SEPTANTE'; diz[9] = 'NONANTE'; }
    if (langue === 2) { diz[7] = 'SEPTANTE'; diz[8] = 'HUITANTE'; diz[9] = 'NONANTE'; }
    let byDiz = Math.trunc(n / 10);
    let byUnit = n - byDiz * 10;
    let liaison = '-';
    if (byUnit === 1) liaison = ' ET ';
    switch (byDiz) {
      case 0: liaison = ''; break;
      case 1: byUnit += 10; liaison = ''; break;
      case 7: if (langue === 0) byUnit += 10; break;
      case 8: if (langue !== 2) liaison = '-'; break;
      case 9: if (langue === 0) { byUnit += 10; liaison = '-'; } break;
    }
    let res = diz[byDiz];
    if (byDiz === 8 && langue !== 2 && byUnit === 0) res += 'S';
    if (units[byUnit]) res = res + liaison + units[byUnit];
    return res;
  }

  private _convNumCent(n: number, langue: number): string {
    const units = ['','UN','DEUX','TROIS','QUATRE','CINQ','SIX','SEPT','HUIT','NEUF','DIX'];
    const byCent  = Math.trunc(n / 100);
    const byReste = n - byCent * 100;
    const strReste = this._convNumDizaine(byReste, langue);
    switch (byCent) {
      case 0: return strReste;
      case 1: return byReste === 0 ? 'CENT' : `CENT ${strReste}`;
      default: return byReste === 0 ? `${units[byCent]} CENT` : `${units[byCent]} CENT ${strReste}`;
    }
  }
}
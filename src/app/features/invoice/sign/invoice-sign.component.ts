import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { InvoiceService } from '../invoice.service';
import { SignService } from '@core/services/sigLocalRest/sign.service';
import { AuthService } from '@core/services/auth.service';
import {
  TYPE_FACT, TYPE_MONTANT, TYPE_TAXE, TYPE_PARTNER, TYPE_DATE,
  TYPE_MATRICULE, FORMAT_DATES
} from '../teif-constants';

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

interface InvoiceEntry {
  id: number;
  name: string;
  teif: string;
  select: boolean;
  state: string;
}

@Component({
  selector: 'app-invoice-sign',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
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
                    <li class="active">Factures en attente de signature</li>
                  </ol>
                </div>
              </div>

              <!-- Alerts -->
              <div *ngFor="let alert of alerts()" class="alert {{alert.type}} divAlert text-center">
                {{ alert.message }}
              </div>
              <br>

              <form name="myForm" class="form-horizontal text-left">

                <!-- File import zone (only when list is empty) -->
                <div class="row" *ngIf="listInvoices().length === 0">
                  <div class="form-group">
                    <div class="col-md-4">
                      <input type="file" id="file" name="file"
                        class="btn btn-primary btn-sm" accept="application/xml"
                        multiple (change)="onFileChange($event)">
                    </div>
                    <div class="col-md-2">
                      <button type="button" class="btn btn-primary btn-sm"
                        (click)="importInvoices()">
                        Importer
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Actions bar -->
                <div class="form-actions pull-right" *ngIf="listInvoices().length > 0">
                  <button type="button" (click)="sign()" class="btn btn-primary btn-sm"
                    [disabled]="disSign()">
                    <span *ngIf="!loader().sign">Signer</span>
                    <span *ngIf="loader().sign">Signature en cours...</span>
                  </button>

                  <button type="button" (click)="send()" class="btn btn-primary btn-sm"
                    [disabled]="disSend()">
                    <span *ngIf="!loader().send">Envoyer</span>
                    <span *ngIf="loader().send">Envoi en cours...</span>
                  </button>

                  <button type="button" (click)="reset()" class="btn btn-warning btn-sm">
                    Initialiser
                  </button>
                </div>

                <!-- Invoice list table -->
                <div class="table-responsive" *ngIf="listInvoices().length > 0">
                  <br><br>
                  <table class="table jh-table table-striped table-hover">
                    <thead>
                      <tr>
                        <th>
                          <input type="checkbox" [(ngModel)]="selectAll" name="selectAll" (change)="checkAll()">
                        </th>
                        <th>Num Facture</th>
                        <th>Action</th>
                        <th>Etat</th>
                      </tr>
                    </thead>
                    <tbody>
                      <ng-container *ngFor="let u of listInvoices(); let i = index">
                        <tr [class.selected]="u.select">
                          <td>
                            <input type="checkbox" [(ngModel)]="u.select" [name]="'sel'+i" (change)="selectInvoice()">
                          </td>
                          <td>{{ u.name }}</td>
                          <td>
                            <a href="" class="button" (click)="$event.preventDefault(); importTeifAt(i)">Visualiser</a>
                          </td>
                          <td>{{ u.state }}</td>
                        </tr>

                        <!-- Inline detail row -->
                        <tr *ngIf="ligneNumber() === i">
                          <td colspan="4">
                            <div *ngIf="selectedTeif">
                              <!-- Mini TEIF detail view -->
                              <div class="panel panel-default">
                                <div class="panel-heading">
                                  <strong>Facture: {{ selectedTeif?.InvoiceBody?.Bgm?.DocumentIdentifier }}</strong>
                                  — Type: {{ selectedTeif?.InvoiceBody?.Bgm?.DocumentType?._code }}
                                </div>
                                <div class="panel-body">
                                  <!-- Partners -->
                                  <div *ngFor="let p of selectedTeif?.InvoiceBody?.PartnerSection?.PartnerDetails; let pi = index" class="well well-sm">
                                    <strong>Partenaire {{pi+1}} ({{p._functionCode}}):</strong>
                                    {{ p.Nad?.PartnerName?.__text }} — {{ p.Nad?.PartnerIdentifier?.__text }}
                                  </div>
                                  <!-- Amounts -->
                                  <h5>Montants</h5>
                                  <table class="table table-condensed">
                                    <tr *ngFor="let a of selectedTeif?.InvoiceBody?.InvoiceMoa?.AmountDetails">
                                      <td>{{ a.Moa?._amountTypeCode }}</td>
                                      <td>{{ a.Moa?.Amount?.__text }} {{ a.Moa?.Amount?._currencyIdentifier }}</td>
                                    </tr>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </ng-container>
                    </tbody>
                  </table>
                </div>

                <!-- Invalid invoices -->
                <div *ngIf="listInvalidInvoices().length > 0" class="panel panel-danger">
                  <div class="panel-heading">Factures invalides</div>
                  <div class="panel-body">
                    <div *ngFor="let inv of listInvalidInvoices()" class="alert alert-danger">
                      <strong>{{ inv.id }}</strong>: {{ inv.errors }}
                    </div>
                  </div>
                </div>

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
export class InvoiceSignComponent implements OnInit {
  private invoiceService = inject(InvoiceService);
  private signService    = inject(SignService);
  private authService    = inject(AuthService);

  // ─── Expose account signal from AuthService (identique aux autres composants) ───
  readonly account = this.authService.account;

  // ─── Constants ───
  readonly typeFact = TYPE_FACT;
  readonly typeMontant = TYPE_MONTANT;
  readonly typeTaxe = TYPE_TAXE;
  readonly typePartner = TYPE_PARTNER;
  readonly typeDate = TYPE_DATE;
  readonly typeMatricule = TYPE_MATRICULE;
  readonly formatDat = FORMAT_DATES;

  // ─── Signals ───
  alerts              = signal<{ message: string; type: string }[]>([]);
  loader              = signal({ sign: false, send: false });
  disSign             = signal(false);
  disSend             = signal(true);
  listInvoices        = signal<InvoiceEntry[]>([]);
  listInvalidInvoices = signal<{ id: string; errors: string }[]>([]);
  ligneNumber         = signal<number | null>(null);
  selectAll           = false;

  selectedTeif: any   = null;
  private selectedFiles: FileList | null = null;

  ngOnInit(): void {
    // account() signal déjà disponible via AuthService — pas d'init nécessaire
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = input.files;
  }

  // ─── Import multiple XML files: validate each via backend ───
  importInvoices(): void {
    if (!this.selectedFiles?.length) return;

    let totalSize = 0;
    for (let j = 0; j < this.selectedFiles.length; j++) {
      totalSize += this.selectedFiles[j].size;
    }
    if (totalSize > MAX_FILE_SIZE) {
      this.addAlert('la taille totale des factures importées dépasse 2 MO, importer moins de factures', 'alert-danger');
      this._clearFileInput();
      return;
    }

    this.listInvoices.set([]);
    this.listInvalidInvoices.set([]);

    Array.from(this.selectedFiles).forEach(file => {
      const name = file.name;
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onloadend = (e: any) => {
        const data = e.target.result as string;
        this.invoiceService.validateTeif(data, false, '1.8.9').subscribe({
          next: (res: any) => {
            if (res.response === 'success') {
              const current = this.listInvoices();
              this.listInvoices.set([...current, {
                id: current.length + 1,
                name,
                teif: data,
                select: false,
                state: ''
              }]);
            } else {
              const current = this.listInvalidInvoices();
              this.listInvalidInvoices.set([...current, {
                id: name,
                errors: JSON.stringify(res.errors)
              }]);
            }
          },
          error: (err: any) => {
            const current = this.listInvalidInvoices();
            this.listInvalidInvoices.set([...current, {
              id: name,
              errors: JSON.stringify(err.error?.errors)
            }]);
          }
        });
      };
    });
  }

  // ─── Checkbox helpers ───
  checkAll(): void {
    this.listInvoices.update(list => list.map(inv => ({ ...inv, select: this.selectAll })));
  }

  selectInvoice(): void {
    const all = this.listInvoices().every(inv => inv.select);
    this.selectAll = all;
  }

  // ─── Visualiser (inline expand) with X2JS parse ───
  importTeifAt(index: number): void {
    if (this.ligneNumber() === index) {
      this.ligneNumber.set(null);
      this.selectedTeif = null;
      return;
    }
    this.ligneNumber.set(index);
    const teifXml = this.listInvoices()[index].teif;
    // Utilise window.X2JS (chargé via angular.json assets) — évite le declare global unsafe
    const win = window as any;
    if (!win.X2JS) {
      this.addAlert('X2JS non chargé — vérifier angular.json assets', 'alert-danger');
      return;
    }
    const x2js = new win.X2JS({ arrayAccessFormPaths: TEIF_ARRAY_PATHS });
    const jsonObj = x2js.xml_str2json(teifXml);
    this.selectedTeif = jsonObj.TEIF;
  }

  // ─── Sign selected invoices ───
  sign(): void {
    this.clearAlerts();
    this.loader.update(l => ({ ...l, sign: true }));

    const dataJson = this.listInvoices()
      .filter(inv => inv.select)
      .map(inv => ({ idfacture: inv.id, contenuxml: inv.teif }));

    if (dataJson.length === 0) {
      this.addAlert('Sélectionner au moins une facture', 'alert-warning');
      this.loader.update(l => ({ ...l, sign: false }));
      return;
    }

    this.signService.sign(dataJson).subscribe({
      next: (message: any) => {
        const listDataSig: any[] = message.listDataSig;
        if (listDataSig?.length > 0) {
          this.listInvoices.update(list =>
            list.map(fact => {
              const signed = listDataSig.find(s => s.idfacture === fact.id);
              if (signed) return { ...fact, state: 'Signed', teif: signed.contenuxml };
              return fact;
            })
          );
          this.loader.update(l => ({ ...l, sign: false }));
          this.addAlert('Signature Realisee avec success, veuillez envoyer les factures!', 'alert-info');
          this.disSign.set(true);
          this.disSend.set(false);
        } else {
          this.addAlert('Echec Signature: ' + message.details, 'alert-warning');
          this.disSign.set(false);
          this.disSend.set(true);
          this.loader.update(l => ({ ...l, sign: false }));
        }
      },
      error: () => {
        this.loader.update(l => ({ ...l, sign: false }));
        this.addAlert('Erreur de connexion au service de signature local: vérifier que le service est bien installé et fonctionnel', 'alert-warning');
        this.disSign.set(false);
        this.disSend.set(true);
      }
    });
  }

  // ─── Send signed invoices ───
  send(): void {
    this.loader.update(l => ({ ...l, send: true }));
    const toSend = this.listInvoices().filter(inv => inv.state === 'Signed' && inv.select);

    if (toSend.length === 0) {
      this.loader.update(l => ({ ...l, send: false }));
      return;
    }

    let pendingCount = toSend.length;
    toSend.forEach(inv => {
      this.invoiceService.generateTeif(inv.teif).subscribe({
        next: (res: any) => {
          this.listInvoices.update(list =>
            list.map(f => f.id === inv.id ? { ...f, state: res.detail } : f)
          );
          pendingCount--;
          if (pendingCount === 0) {
            this.disSend.set(true);
            this.loader.update(l => ({ ...l, send: false }));
          }
        },
        error: () => {
          this.clearAlerts();
          this.addAlert('Echec Envoi de la facture', 'alert-warning');
          pendingCount--;
          if (pendingCount === 0) {
            this.loader.update(l => ({ ...l, send: false }));
          }
        }
      });
    });
  }

  // ─── Reset ───
  reset(): void {
    this.clearAlerts();
    this.listInvoices.set([]);
    this.listInvalidInvoices.set([]);
    this.ligneNumber.set(null);
    this.selectedTeif = null;
    this.selectAll = false;
    this.disSign.set(false);
    this.disSend.set(true);
    this._clearFileInput();
  }

  addAlert(message: string, type: string): void {
    this.alerts.update(a => [...a, { message, type }]);
  }

  clearAlerts(): void {
    this.alerts.set([]);
  }

  private _clearFileInput(): void {
    const input = document.getElementById('file') as HTMLInputElement;
    if (input) input.value = '';
  }
}
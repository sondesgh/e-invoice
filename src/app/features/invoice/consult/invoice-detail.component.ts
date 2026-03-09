import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TYPE_MONTANT, TYPE_TAXE, TYPE_PARTNER, TYPE_DATE, labelOf } from '../teif-constants';

/**
 * InvoiceDetailComponent
 *
 * Migré depuis `invoice-detail.html` (ng-include dans invoice-consult).
 *
 * - `ng-show="vm.isSet(tab)"` → `@if (tab === activeTab)`
 * - `(typeMontant|filter:{id:code})[0].name` → `labelOf(TYPE_MONTANT, code)`
 * - `vm.teif` → `@Input() teif`
 * - `vm.tab` / `vm.setTab` → `@Input() activeTab` + `(tabChange)` EventEmitter
 *   (état géré dans InvoiceConsultComponent parent)
 */
@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="col-md-12">
      <ul class="nav nav-tabs">
        @for (t of tabs; track t.id) {
          <li [class.active]="activeTab === t.id">
            <a (click)="activeTab = t.id" style="cursor:pointer">{{ t.label }}</a>
          </li>
        }
      </ul>

      <div class="tab-content">

        <!-- Tab 1 : Infos Facture -->
        @if (activeTab === 1) {
          <br />
          <div class="panel panel-primary">
            <div class="panel-body">
              <div class="row">
                <div class="form-group">
                  <label class="col-md-3 control-lable">Type Facture:</label>
                  <div class="col-md-3">{{ teif?.TEIF?.InvoiceBody?.Bgm?.DocumentType?.__text }}</div>
                  <label class="col-md-3 control-lable">Num Facture:</label>
                  <div class="col-md-3">{{ teif?.TEIF?.InvoiceBody?.Bgm?.DocumentIdentifier }}</div>
                </div>
              </div>
              <div class="row">
                <div class="form-group">
                  <label class="col-md-3 control-lable">Emetteur:</label>
                  <div class="col-md-3">{{ teif?.TEIF?.InvoiceHeader?.MessageSenderIdentifier }}</div>
                  <label class="col-md-3 control-lable">Receveur:</label>
                  <div class="col-md-3">{{ teif?.TEIF?.InvoiceHeader?.MessageRecieverIdentifier }}</div>
                </div>
              </div>
              <div class="row">
                <div class="form-group">
                  <label class="col-md-3 control-lable">Date Emission Document:</label>
                  <div class="col-md-3">{{ teif?.TEIF?.InvoiceBody?.Dtm?.DateText?.[0]?.__text }}</div>
                </div>
              </div>
              @for (dateItem of teif?.TEIF?.InvoiceBody?.Dtm?.DateText; track $index) {
                @if ($index > 0) {
                  <div class="row">
                    <div class="form-group">
                      <label class="col-md-3 control-lable">{{ labelOf(typeDate, dateItem._functionCode) }}:</label>
                      <div class="col-md-3">{{ dateItem.__text }}</div>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        }

        <!-- Tab 2 : Partenaires -->
        @if (activeTab === 2) {
          @for (item of teif?.TEIF?.InvoiceBody?.PartnerSection?.PartnerDetails; track $index) {
            <label class="control-lable">{{ labelOf(typePartner, item._functionCode) }}</label>
            <div class="panel panel-primary">
              <div class="panel-body">
                <div class="row">
                  <div class="form-group">
                    <label class="col-md-2 control-lable">Identifiant:</label>
                    <div class="col-md-4">{{ item.Nad?.PartnerIdentifier?.__text }}</div>
                    <label class="col-md-3 control-lable">Nom/Raison Sociale:</label>
                    <div class="col-md-3">{{ item.Nad?.PartnerName?.__text }}</div>
                  </div>
                </div>
                @for (adr of item.Nad?.PartnerAdresses; track $index) {
                  <div class="row">
                    <div class="form-group">
                      <label class="col-md-2 control-lable">Adresse:</label>
                      <div class="col-md-10">{{ adr.AdressDescription }}</div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }

        <!-- Tab 3 : Articles -->
        @if (activeTab === 3) {
          <br />
          <div class="panel panel-danger">
            <div class="panel-body divScroll">
              <table class="table table-hover table-bordered">
                <thead>
                  <tr>
                    <th>Identifiant</th><th>Code</th><th>Designation</th>
                    <th>Quantite</th><th>Unite Mesure</th><th>Montant</th><th>Taxe</th>
                  </tr>
                </thead>
                <tbody>
                  @for (lin of teif?.TEIF?.InvoiceBody?.LinSection?.Lin; track $index) {
                    <tr>
                      <td>{{ lin.ItemIdentifier }}</td>
                      <td>{{ lin.LinImd?.ItemCode }}</td>
                      <td>{{ lin.LinImd?.ItemDescription }}</td>
                      <td>{{ lin.LinQty?.Quantity?.__text }}</td>
                      <td>{{ lin.LinQty?.Quantity?._measurementUnit }}</td>
                      <td>
                        @for (moa of lin.LinMoa?.MoaDetails; track $index) {
                          <div><strong>{{ labelOf(typeMontant, moa.Moa?._amountTypeCode) }}</strong></div>
                          <div>Devise: {{ moa.Moa?.Amount?._currencyIdentifier }}</div>
                          <div>Montant: {{ moa.Moa?.Amount?.__text }}</div>
                        }
                      </td>
                      <td>
                        @for (tax of lin.LinTax; track $index) {
                          <div><strong>{{ labelOf(typeTaxe, tax.TaxTypeName?._code) }}</strong></div>
                          <div>Taxe(%): {{ tax.TaxDetails?.TaxRate }}</div>
                          <div>Base(%): {{ tax.TaxDetails?.TaxRateBasis }}</div>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- Tab 4 : Montants -->
        @if (activeTab === 4) {
          <div class="panel panel-primary">
            <div class="panel-body divScroll">
              @for (mnt of teif?.TEIF?.InvoiceBody?.InvoiceMoa?.AmountDetails; track $index) {
                <div class="row">
                  <div class="form-group">
                    <label class="col-md-12 control-lable">{{ labelOf(typeMontant, mnt.Moa?._amountTypeCode) }}</label>
                  </div>
                </div>
                <div class="row">
                  <div class="form-group">
                    <div class="col-md-3">Devise: {{ mnt.Moa?.Amount?._currencyIdentifier }}</div>
                    <div class="col-md-5">Montant: {{ mnt.Moa?.Amount?.__text }}</div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Tab 5 : Taxes -->
        @if (activeTab === 5) {
          <div class="panel panel-primary">
            <div class="panel-body divScroll">
              @for (tax of teif?.TEIF?.InvoiceBody?.InvoiceTax?.InvoiceTaxDetails; track $index) {
                <div class="row">
                  <div class="form-group">
                    <label class="col-md-6 control-lable">{{ labelOf(typeTaxe, tax.Tax?.TaxTypeName?._code) }}</label>
                    <div class="col-md-5">Taxe(%): {{ tax.Tax?.TaxDetails?.TaxRate }}</div>
                  </div>
                </div>
                @for (mntax of tax.AmountDetails; track $index) {
                  <div class="row">
                    <div class="form-group">
                      <label class="col-md-12 control-lable">{{ labelOf(typeMontant, mntax.Moa?._amountTypeCode) }}</label>
                    </div>
                  </div>
                  <div class="row">
                    <div class="form-group">
                      <div class="col-md-3">Devise: {{ mntax.Moa?.Amount?._currencyIdentifier }}</div>
                      <div class="col-md-5">Montant: {{ mntax.Moa?.Amount?.__text }}</div>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        }

        <!-- Tab 6 : Réduction/Charge -->
        @if (activeTab === 6) {
          <br />
          <div class="panel panel-primary"><div class="panel-body"></div></div>
        }

      </div>
    </div>
  `,
})
export class InvoiceDetailComponent {
  @Input() teif: any = {};

  activeTab = 1;

  readonly typeMontant = TYPE_MONTANT;
  readonly typeTaxe    = TYPE_TAXE;
  readonly typePartner = TYPE_PARTNER;
  readonly typeDate    = TYPE_DATE;
  readonly labelOf     = labelOf;

  readonly tabs = [
    { id: 1, label: 'Infos Facture' },
    { id: 2, label: 'Partenaires' },
    { id: 3, label: 'Articles' },
    { id: 4, label: 'Montants' },
    { id: 5, label: 'Taxes' },
    { id: 6, label: 'Reduction/Charge' },
  ];
}

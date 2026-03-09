import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { EDocService, EDoc } from './e-doc.service';

/**
 * EDocDetailComponent
 * Migré depuis EDocDetailController + e-doc-detail.html
 *
 * Extrait de e-doc.component.ts — chaque composant doit avoir son propre fichier.
 * Correction : onclick="window.history.back()" → routerLink="../"
 */
@Component({
  selector: 'app-e-doc-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule],
  template: `
    <div class="wrapper1">
      <section class="bg-transparent">
        <div class="row"><div class="col-md-12"><br><br>
          <div class="row"><div class="col-sm-12 form-box"><div class="form-bottom">

            <div *ngIf="eDoc">
              <h2>
                <span translate="portailElFatooraApp.eDoc.detail.title"></span>
                {{ eDoc.id }}
              </h2>
              <hr>

              <dl class="dl-horizontal jh-entity-details">
                <dt translate="portailElFatooraApp.eDoc.receiverCode"></dt>
                <dd>{{ eDoc.receiverCode }}</dd>

                <dt translate="portailElFatooraApp.eDoc.documentNumber"></dt>
                <dd>{{ eDoc.documentNumber }}</dd>

                <dt translate="portailElFatooraApp.eDoc.documentType"></dt>
                <dd>{{ eDoc.documentType }}</dd>

                <dt translate="portailElFatooraApp.eDoc.dateProcess"></dt>
                <dd>{{ eDoc.dateProcess | date:'mediumDate' }}</dd>

                <dt translate="portailElFatooraApp.eDoc.dateDocument"></dt>
                <dd>{{ eDoc.dateDocument | date:'mediumDate' }}</dd>

                <dt translate="portailElFatooraApp.eDoc.amountTax"></dt>
                <dd>{{ eDoc.amountTax }}</dd>

                <dt translate="portailElFatooraApp.eDoc.amount"></dt>
                <dd>{{ eDoc.amount }}</dd>

                <dt translate="portailElFatooraApp.eDoc.generatedRef"></dt>
                <dd>{{ eDoc.generatedRef }}</dd>

                <dt translate="portailElFatooraApp.eDoc.processStatus"></dt>
                <dd>{{ eDoc.processStatus }}</dd>

                <dt translate="portailElFatooraApp.eDoc.partnerBySenderCode"></dt>
                <dd>
                  <a [routerLink]="['/entities/partner', eDoc.partnerBySenderCode?.id]">
                    {{ eDoc.partnerBySenderCode?.id }}
                  </a>
                </dd>
              </dl>

              <!-- routerLink="../" remplace onclick="window.history.back()" -->
              <button type="button" class="btn btn-info" routerLink="../">
                <span class="glyphicon glyphicon-arrow-left"></span>&nbsp;
                <span translate="entity.action.back"></span>
              </button>
            </div>

          </div></div></div>
        </div></div>
      </section>
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

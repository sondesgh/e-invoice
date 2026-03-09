import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * InvoiceDetailErrorsComponent
 *
 * Migré depuis `invoice-detail-errors.html`.
 * Affiche la liste des erreurs de traitement d'une facture (processStatus === 'X').
 */
@Component({
    selector: 'app-invoice-detail-errors',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="col-md-12">
        <ul class="nav nav-tabs">
          <li class="active"><a>Liste des Erreurs</a></li>
        </ul>
        <div class="tab-content">
          <br />
          <div class="panel panel-primary">
            <div class="panel-body">
              <br />
              @for (error of errors; track $index) {
                <span>{{ error }}</span><br />
              }
              <br />
            </div>
          </div>
        </div>
      </div>
    `,
  })
  export class InvoiceDetailErrorsComponent {
    @Input() errors: string[] = [];
  }
  
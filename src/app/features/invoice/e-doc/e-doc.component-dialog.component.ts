import {
  Component, OnInit, signal, inject, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { EDocService, EDoc } from './e-doc.service';

// ════════════════════════════════════════════════════════════════════════════
// EDocDialogComponent — Migré depuis EDocDialogController + e-doc-dialog.html
// ════════════════════════════════════════════════════════════════════════════

import { EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'app-e-doc-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="modal-backdrop fade in" style="opacity:.5"></div>
    <div class="modal fade in" style="display:block">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <form novalidate #ef="ngForm" (ngSubmit)="save()">
            <div class="modal-header">
              <button type="button" class="close" (click)="cancel()">&times;</button>
              <h4 class="modal-title" translate="portailElFatooraApp.eDoc.home.createOrEditLabel"></h4>
            </div>
            <div class="modal-body">

              @if (eDoc.id) {
                <div class="form-group">
                  <label translate="global.field.id"></label>
                  <input type="text" class="form-control" [value]="eDoc.id" readonly />
                </div>
              }

              <div class="form-group">
                <label translate="portailElFatooraApp.eDoc.receiverCode"></label>
                <input type="text" class="form-control" name="receiverCode"
                       [(ngModel)]="eDoc.receiverCode" maxlength="35" />
              </div>
              <div class="form-group">
                <label translate="portailElFatooraApp.eDoc.documentNumber"></label>
                <input type="text" class="form-control" name="documentNumber"
                       [(ngModel)]="eDoc.documentNumber" required maxlength="20" />
              </div>
              <div class="form-group">
                <label translate="portailElFatooraApp.eDoc.documentType"></label>
                <input type="text" class="form-control" name="documentType"
                       [(ngModel)]="eDoc.documentType" required maxlength="35" />
              </div>
              <div class="form-group">
                <label translate="portailElFatooraApp.eDoc.dateProcess"></label>
                <input type="date" class="form-control" name="dateProcess"
                       [(ngModel)]="eDoc.dateProcess" />
              </div>
              <div class="form-group">
                <label translate="portailElFatooraApp.eDoc.dateDocument"></label>
                <input type="date" class="form-control" name="dateDocument"
                       [(ngModel)]="eDoc.dateDocument" />
              </div>
              <div class="form-group">
                <label translate="portailElFatooraApp.eDoc.amountTax"></label>
                <input type="number" class="form-control" name="amountTax" [(ngModel)]="eDoc.amountTax" />
              </div>
              <div class="form-group">
                <label translate="portailElFatooraApp.eDoc.amount"></label>
                <input type="number" class="form-control" name="amount" [(ngModel)]="eDoc.amount" />
              </div>
              <div class="form-group">
                <label translate="portailElFatooraApp.eDoc.generatedRef"></label>
                <input type="text" class="form-control" name="generatedRef"
                       [(ngModel)]="eDoc.generatedRef" maxlength="100" />
              </div>
              <div class="form-group">
                <label translate="portailElFatooraApp.eDoc.processStatus"></label>
                <input type="text" class="form-control" name="processStatus" [(ngModel)]="eDoc.processStatus" />
              </div>

            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-default" (click)="cancel()">
                <span class="glyphicon glyphicon-ban-circle"></span>&nbsp;
                <span translate="entity.action.cancel"></span>
              </button>
              <button type="submit" [disabled]="ef.invalid || isSaving" class="btn btn-primary">
                <span class="glyphicon glyphicon-save"></span>&nbsp;
                <span translate="entity.action.save"></span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class EDocDialogComponent {
  private readonly eDocService = inject(EDocService);

  @Input() entity: EDoc | null = null;
  @Output() saved    = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  eDoc: Partial<EDoc> = {};
  isSaving = false;

  ngOnInit(): void {
    this.eDoc = this.entity
      ? { ...this.entity }
      : { receiverCode: null as any, documentNumber: '', documentType: '', dateProcess: null, dateDocument: null, amountTax: null as any, amount: null as any, generatedRef: null as any, processStatus: null as any, id: undefined };
  }

  save(): void {
    this.isSaving = true;
    const obs: Observable<any> = this.eDoc.id
      ? this.eDocService.update(this.eDoc)
      : this.eDocService.save(this.eDoc);
    obs.subscribe({
      next: () => { this.isSaving = false; this.saved.emit(); },
      error: () => { this.isSaving = false; },
    });
  }

  cancel(): void { this.cancelled.emit(); }
}

// ════════════════════════════════════════════════════════════════════════════
// EDocDeleteDialogComponent — Migré depuis EDocDeleteController + e-doc-delete-dialog.html
// ════════════════════════════════════════════════════════════════════════════

@Component({
  selector: 'app-e-doc-delete-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="modal-backdrop fade in" style="opacity:.5"></div>
    <div class="modal fade in" style="display:block">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" (click)="clear()">&times;</button>
            <h4 class="modal-title" translate="entity.delete.title"></h4>
          </div>
          <div class="modal-body">
            <p translate="portailElFatooraApp.eDoc.delete.question"
               [translateParams]="{ id: entity?.id }">
              Are you sure you want to delete this E Doc?
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-default" (click)="clear()">
              <span class="glyphicon glyphicon-ban-circle"></span>&nbsp;
              <span translate="entity.action.cancel"></span>
            </button>
            <button class="btn btn-danger" (click)="confirmDelete()">
              <span class="glyphicon glyphicon-remove-circle"></span>&nbsp;
              <span translate="entity.action.delete"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class EDocDeleteDialogComponent {
  private readonly eDocService = inject(EDocService);

  @Input() entity: EDoc | null = null;
  @Output() deleted   = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  confirmDelete(): void {
    if (this.entity?.id == null) return;
    this.eDocService.delete(this.entity.id).subscribe({
      next: () => this.deleted.emit(),
    });
  }

  clear(): void { this.cancelled.emit(); }
}

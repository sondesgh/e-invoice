import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertService, Alert } from '@core/services/notification.service';

/**
 * AlertComponent — global alerts banner.
 *
 * Migrated from AngularJS `<jhi-alert>` component (alert.directive.js).
 *
 * Renders all alerts currently held in `AlertService`.
 * The alert list is a reactive signal — no manual subscriptions needed.
 *
 * Usage:
 * ```html
 * <app-alert />
 * ```
 */
@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alerts">
      @for (alert of alertService.alerts(); track alert.id) {
        <div
          class="alert alert-{{ alert.type }} alert-dismissible"
          [class.toast]="alert.toast"
          [ngClass]="alert.position"
          role="alert"
        >
          <!-- Mirrors legacy: <pre ng-bind-html="alert.msg"> -->
          <span [innerHTML]="alert.msg"></span>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            (click)="closeAlert(alert)"
          ></button>
        </div>
      }
    </div>
  `,
  styles: [`
    .alerts {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      min-width: 280px;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .toast {
      opacity: 0.95;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `],
})
export class AlertComponent {
  readonly alertService = inject(AlertService);
  closeAlert(alert: Alert) { this.alertService.closeAlert(alert.id); }
}
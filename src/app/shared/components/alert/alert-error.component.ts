import {
  Component,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AlertService, Alert } from '@core/services/notification.service';

interface FieldError {
  objectName: string;
  field: string;
  message: string;
}

interface ErrorBody {
  message?: string;
  fieldErrors?: FieldError[];
  [key: string]: unknown;
}

/**
 * AlertErrorComponent — scoped HTTP error alerts.
 *
 * Migrated from AngularJS `<jhi-alert-error>` (alert-error.directive.js).
 *
 * Listens to `AlertService.httpError$` and renders contextual error messages
 * with full field-level validation support. Each instance manages its own
 * local alert array (scoped = true) so errors don't bleed into global alerts.
 *
 * Place inside any form, modal, or page that should display HTTP errors:
 * ```html
 * <app-alert-error />
 * ```
 */
@Component({
  selector: 'app-alert-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alerts">
      @for (alert of alerts; track alert.id) {
        <div
          class="alert alert-{{ alert.type }} alert-dismissible"
          [class.toast]="alert.toast"
          role="alert"
        >
          <pre>{{ alert.msg }}</pre>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            (click)="alert.close(alerts)"
          ></button>
        </div>
      }
    </div>
  `,
  styles: [`
    .alerts { margin-bottom: 1rem; }
    pre { margin: 0; white-space: pre-wrap; font-family: inherit; font-size: inherit; }
  `],
})
export class AlertErrorComponent implements OnInit, OnDestroy {
  private readonly alertService = inject(AlertService);
  private readonly translate = inject(TranslateService);

  /** Local scoped alert list — mirrors legacy `vm.alerts = []`. */
  alerts: Alert[] = [];

  private _httpSub!: Subscription;

  ngOnInit(): void {
    this._httpSub = this.alertService.httpError$.subscribe((error) => {
      this._handleHttpError(error);
    });
  }

  ngOnDestroy(): void {
    this._httpSub?.unsubscribe();
    this.alerts = [];
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _addErrorAlert(message: string, key?: string, data?: Record<string, unknown>): void {
    const resolvedKey = key ?? message;
    const alert = this.alertService.add(
      {
        type: 'danger',
        msg: resolvedKey,
        msgParams: data,
        timeout: 5_000,
        toast: this.alertService.isToast(),
        scoped: true,
      },
      this.alerts
    );
    this.alerts.push(alert);
  }

  /**
   * Full error-parsing logic from legacy `jhiAlertErrorController`.
   *
   * Handles:
   *  - status 0  → server not reachable
   *  - status 400 → X-portailElFatooraApp-error header, fieldErrors, or generic message
   *  - status 404 → URL not found
   *  - default    → message or stringified response
   */
  private _handleHttpError(response: HttpErrorResponse): void {
    const body = response.error as ErrorBody | string | null;

    switch (response.status) {
      case 0:
        this._addErrorAlert('Server not reachable', 'error.server.not.reachable');
        break;

      case 400: {
        const errorHeader = response.headers.get('X-portailElFatooraApp-error');
        const entityKey   = response.headers.get('X-portailElFatooraApp-params') ?? '';

        if (errorHeader) {
          const entityName = this.translate.instant(`global.menu.entities.${entityKey}`);
          this._addErrorAlert(errorHeader, errorHeader, { entityName });

        } else if (body && typeof body === 'object' && body.fieldErrors?.length) {
          for (const fieldError of body.fieldErrors) {
            // convert 'something[14].other[4].id' → 'something[].other[].id'
            const convertedField = fieldError.field.replace(/\[\d*\]/g, '[]');
            const fieldName = this.translate.instant(
              `portailElFatooraApp.${fieldError.objectName}.${convertedField}`
            );
            this._addErrorAlert(
              `Field ${fieldName} cannot be empty`,
              `error.${fieldError.message}`,
              { fieldName }
            );
          }

        } else if (body && typeof body === 'object' && body.message) {
          this._addErrorAlert(body.message, body.message, body as Record<string, unknown>);

        } else if (body) {
          this._addErrorAlert(typeof body === 'string' ? body : JSON.stringify(body));
        }
        break;
      }

      case 404:
        this._addErrorAlert('Not found', 'error.url.not.found');
        break;

      default:
        if (body && typeof body === 'object' && body.message) {
          this._addErrorAlert(body.message);
        } else {
          this._addErrorAlert(JSON.stringify(response));
        }
        break;
    }
  }
}

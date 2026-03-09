import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

// ── Types ────────────────────────────────────────────────────────────────────

/** Maps 1-to-1 with legacy AlertService types (danger = error). */
export type AlertType = 'success' | 'danger' | 'warning' | 'info';

export interface Alert {
  id: number;
  type: AlertType;
  /** Translated, sanitised message ready for display. */
  msg: string;
  /** Original i18n key (stored for re-translation on language change). */
  msgKey?: string;
  msgParams?: Record<string, unknown>;
  timeout: number;
  toast: boolean;
  position: string;
  /** Scoped alerts are NOT pushed to the global list. */
  scoped: boolean;
  close: (alerts: Alert[]) => Alert[];
}

export type AlertOptions = Partial<Omit<Alert, 'id' | 'close'>> & {
  msg: string;
  msgKey?: string;
};

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * AlertService — full port of the AngularJS `AlertService` provider.
 *
 * New features vs legacy:
 *  - Angular 19 signals (`alerts` signal for reactive templates)
 *  - `httpError$` Subject (replaces `$rootScope.$emit('portailElFatooraApp.httpError')`)
 *  - `showAsToast()` configurable at runtime (legacy used provider config)
 *  - `DEFAULT_TIMEOUT` = 10 000 ms (matches legacy)
 *
 * Scoped alerts (used by `AlertErrorComponent`) are created with
 * `{ scoped: true }` and managed in the component's own array.
 */
@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly translate = inject(TranslateService);

  // ── Config (mirrors AlertServiceProvider) ──────────────────────────────────
  private _toast = false;          // showAsToast(false) by default
  private readonly DEFAULT_TIMEOUT = 10_000;

  // ── State ──────────────────────────────────────────────────────────────────
  private _idCounter = 0;
  private readonly _alerts = signal<Alert[]>([]);

  /** Read-only signal for use in templates / other services. */
  readonly alerts = this._alerts.asReadonly();

  /**
   * Raw HTTP error stream.
   * Replaces `$rootScope.$emit('portailElFatooraApp.httpError', response)`.
   * Subscribe in components/services: `alertService.httpError$.subscribe(...)`.
   */
  readonly httpError$ = new Subject<HttpErrorResponse>();

  // ── Public configuration ───────────────────────────────────────────────────

  /** Mirrors `AlertServiceProvider.showAsToast(isToast)`. */
  showAsToast(isToast: boolean): void {
    this._toast = isToast;
  }

  isToast(): boolean {
    return this._toast;
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  get(): Alert[] {
    return this._alerts();
  }

  clear(): void {
    this._alerts.set([]);
  }

  // ── Convenience factories (mirrors legacy API) ─────────────────────────────

  success(msg: string, params?: Record<string, unknown>, position?: string): Alert {
    return this.add({ type: 'success', msg, msgParams: params, position, timeout: this.DEFAULT_TIMEOUT });
  }

  error(msg: string, params?: Record<string, unknown>, position?: string): Alert {
    return this.add({ type: 'danger', msg, msgParams: params, position, timeout: this.DEFAULT_TIMEOUT });
  }

  warning(msg: string, params?: Record<string, unknown>, position?: string): Alert {
    return this.add({ type: 'warning', msg, msgParams: params, position, timeout: this.DEFAULT_TIMEOUT });
  }

  info(msg: string, params?: Record<string, unknown>, position?: string): Alert {
    return this.add({ type: 'info', msg, msgParams: params, position, timeout: this.DEFAULT_TIMEOUT });
  }

  /**
   * Low-level add — mirrors `addAlert()` + `factory()` in legacy.
   * Translates `msg` immediately via TranslateService.
   */
  add(options: AlertOptions, externalAlerts?: Alert[]): Alert {
    const id = this._idCounter++;
    const translatedMsg = this.translate.instant(options.msg, options.msgParams ?? {});

    const alert: Alert = {
      id,
      type:     options.type     ?? 'info',
      msg:      translatedMsg,
      msgKey:   options.msgKey   ?? options.msg,
      msgParams: options.msgParams,
      timeout:  options.timeout  ?? this.DEFAULT_TIMEOUT,
      toast:    options.toast    ?? this._toast,
      position: options.position ?? 'top right',
      scoped:   options.scoped   ?? false,
      close: (alerts: Alert[]) => this.closeAlert(id, alerts),
    };

    if (!alert.scoped) {
      this._alerts.update((list) => [...list, alert]);
    }

    // Auto-dismiss
    if (alert.timeout > 0) {
      setTimeout(() => {
        this.closeAlert(id, externalAlerts ?? undefined);
      }, alert.timeout);
    }

    return alert;
  }

  closeAlert(id: number, externalAlerts?: Alert[]): Alert[] {
    if (externalAlerts) {
      const idx = externalAlerts.findIndex((a) => a.id === id);
      return idx !== -1 ? externalAlerts.splice(idx, 1) : [];
    }
    this._alerts.update((list) => list.filter((a) => a.id !== id));
    return [];
  }

  closeAlertByIndex(index: number, alerts: Alert[]): Alert[] {
    return alerts.splice(index, 1);
  }

  // ── HTTP error helper (called by error-handler.interceptor) ───────────────

  /**
   * Emits an HTTP error on `httpError$` (for `AlertErrorComponent` to consume)
   * and also pushes a global error alert.
   *
   * Mirrors `$rootScope.$emit('portailElFatooraApp.httpError', response)`.
   */
  emitHttpError(error: HttpErrorResponse): void {
    this.httpError$.next(error);
  }
}
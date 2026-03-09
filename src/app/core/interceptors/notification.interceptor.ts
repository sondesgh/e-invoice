import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpResponse,
} from '@angular/common/http';
import { inject , Injector } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AlertService } from '../services/notification.service';

/**
 * Notification interceptor.
 *
 * Mirrors legacy `notificationInterceptor`:
 *  - On SUCCESS responses: reads `X-portailElFatooraApp-alert` /
 *    `X-portailElFatooraApp-params` headers and surfaces a success toast.
 *
 * Error notifications are delegated to `error-handler.interceptor` via
 * `NotificationService.emitHttpError()` to keep concerns separate.
 */
export const notificationInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
 // const alertService = inject(AlertService);
 const injector = inject(Injector);
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const alertKey = event.headers.get('X-portailElFatooraApp-alert');
        // On récupère AlertService seulement au moment du succès de la requête
        const alertService = injector.get(AlertService);
        if (typeof alertKey === 'string' && alertKey.length > 0) {
          const params = event.headers.get('X-portailElFatooraApp-params') ?? '';
          alertService.success(alertKey, { param: decodeURIComponent(params) });
        }
      }
    })
  );
};
import {
  HttpInterceptorFn, HttpErrorResponse, HttpBackend, HttpClient,
} from '@angular/common/http';
import { inject, PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AlertService } from '../services/notification.service';

/**
 * Fusionne errorHandlerInterceptor.js + authExpiredInterceptor.js
 *
 * 1. errorHandlerInterceptor → émet httpError sauf (401 + /api/account)
 * 2. authExpiredInterceptor  → 401 : logout + storePreviousState
 *                           → 403 + CSRF vide + non-GET : refresh + retry
 */
const CSRF_COOKIE  = 'CSRF-TOKEN';
const CSRF_HEADER  = 'X-CSRF-TOKEN';
const CSRF_REFRESH = '/portailElFatoora/';

function getCsrfToken(): string {
  try {
    const prefix = `${CSRF_COOKIE}=`;
    return document.cookie.split(';').map(c => c.trim())
      .find(c => c.startsWith(prefix))?.substring(prefix.length) ?? '';
  } catch { return ''; }
}

export const errorHandlerInterceptor: HttpInterceptorFn = (req, next) => {
  const router      = inject(Router);
  const authService = inject(AuthService);
  //const notify      = inject(AlertService);
  const platformId  = inject(PLATFORM_ID);
  const backend     = inject(HttpBackend);          //  bypass intercepteurs
  const http        = new HttpClient(backend);      //  pas de boucle
  const injector = inject(Injector); //  On injecte l'injecteur pour retarder l'accès aux services
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      const notify = injector.get(AlertService);
      const path        = (error.error as { path?: string })?.path ?? '';
      const isEmptyBody = error.error === '' || error.error === null;
      const isAccountCall = req.url.includes('api/account') || path.startsWith('/api/account');

      // ── errorHandlerInterceptor legacy ──────────────────────────────────
      if (!(error.status === 401 && (isEmptyBody || isAccountCall))) {
        notify.emitHttpError(error);
      }

      // ── authExpiredInterceptor — 401 ────────────────────────────────────
      if (error.status === 401 && !isAccountCall && !req.url.includes('api/authentication')) {
        authService.authenticate(null);
        const prev = authService.getPreviousState();
        if (!prev || prev.name !== 'accessdenied') {
          authService.storePreviousState(req.url);
        }
        router.navigate(['/accessdenied']);
        return throwError(() => error);
      }

      // ── authExpiredInterceptor — 403 + CSRF vide + non-GET ──────────────
      if (
        error.status === 403 &&
        req.method !== 'GET' &&
        isPlatformBrowser(platformId) &&
        getCsrfToken() === ''
      ) {
        const http = inject(HttpClient);
        return http.get(CSRF_REFRESH).pipe(
          switchMap(() => {
            const newCsrf = getCsrfToken();
            if (!newCsrf) return throwError(() => error);
            return next(req.clone({ setHeaders: { [CSRF_HEADER]: newCsrf } }));
          }),
          catchError(() => throwError(() => error))
        );
      }

      // ── Navigation ──────────────────────────────────────────────────────
      switch (error.status) {
        case 0:   router.navigate(['/error']); break;
        case 403: router.navigate(['/accessdenied']); break;
        case 404: router.navigate(['/error'], { state: { status: 404 } }); break;
        default:
          if (error.status >= 500) router.navigate(['/error'], { state: { status: error.status } });
      }

      return throwError(() => error);
    })
  );
};
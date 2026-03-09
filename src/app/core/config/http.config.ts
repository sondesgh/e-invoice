import { Provider, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpInterceptorFn,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * HTTP configuration constants.
 *
 * Mirrors `http.config.js`:
 *  - CSRF cookie / header names
 *  - Cache-busting URL patterns
 *  - Fallback route (replaces $urlRouterProvider.otherwise('/'))
 */

/** Cookie name for CSRF token (Spring Security default override). */
export const XSRF_COOKIE_NAME = 'CSRF-TOKEN';
/** Header name sent with mutating requests. */
export const XSRF_HEADER_NAME = 'X-CSRF-TOKEN';

/**
 * URL patterns whose responses must NOT be cached.
 * Mirrors `httpRequestInterceptorCacheBusterProvider.setMatchlist(...)`.
 */
export const CACHE_BUST_PATTERNS: RegExp[] = [/.*api.*/, /.*protected.*/];

/**
 * Cache-busting interceptor.
 *
 * Appends a timestamp query parameter to every request whose URL matches
 * one of the CACHE_BUST_PATTERNS, preventing stale REST responses.
 *
 * Replaces the legacy `httpRequestInterceptorCacheBusterProvider`.
 */
export const cacheBustInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const shouldBust = CACHE_BUST_PATTERNS.some((p) => p.test(req.url));

  if (shouldBust && req.method === 'GET') {
    const busted = req.clone({
      setParams: { _: Date.now().toString() },
    });
    return next(busted);
  }

  return next(req);
};

/**
 * Boolean route-param matcher.
 *
 * Mirrors the $urlMatcherFactoryProvider `boolean` type from http.config.js.
 * Register this in your route definitions using Angular Router's custom
 * URL matchers or encode booleans as '0'/'1' strings in the path.
 *
 * ```ts
 * // In routes:
 * { path: 'items/:active', component: ItemsComponent }
 *
 * // In component:
 * const active = booleanParamDecode(route.params['active']); // → true/false
 * ```
 */
export function booleanParamDecode(val: unknown): boolean {
  return val === true || val === 'true' || val === 1 || val === '1';
}

export function booleanParamEncode(val: boolean): string {
  return val ? '1' : '0';
}

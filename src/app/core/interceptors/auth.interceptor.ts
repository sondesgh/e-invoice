import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';

/**
 * Miroir du legacy : attache le Bearer token JWT à chaque requête.
 * Le legacy stockait dans $localStorage['jhi-authenticationToken']
 * (préfixe 'jhi-' depuis localstorage.config.js).
 * Fallback : sessionStorage (rememberMe=false) → localStorage (rememberMe=true)
 */
const TOKEN_KEY = 'jhi-authenticationToken';

function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
  } catch { return null; }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return next(req);

  const token = getStoredToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
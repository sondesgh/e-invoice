import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from, EMPTY } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

import {
  Account,
  LoginCredentials,
  PasswordResetInit,
  PasswordResetFinish,
  ChangePassword,
  ContactPayload,
  PreviousState,
} from '../models/account.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // ── Signals ────────────────────────────────────────────────────────────────
  private readonly _account = signal<Account | null | undefined>(undefined);
  private readonly _authenticated = signal<boolean>(false);

  /** Expose account as a readonly signal. */
  readonly account = this._account.asReadonly();

  /** Derived boolean: true once identity has been resolved at least once. */
  readonly isIdentityResolved = computed(() => this._account() !== undefined);

  /** Derived boolean: true when a valid account is loaded. */
  readonly isAuthenticated = computed(() => this._authenticated());

  /** Derived authorities list (empty array when unauthenticated). */
  readonly authorities = computed(() => this._account()?.authorities ?? []);

  // ── Private state ──────────────────────────────────────────────────────────
  private _previousState: PreviousState | null = null;
  private _identityPromise: Promise<Account | null> | null = null;

  // ══════════════════════════════════════════════════════════════════════════
  // Identity
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Resolves the current user identity.
   * Results are cached; pass `force = true` to invalidate the cache.
   */
  identity(force = false): Promise<Account | null> {
    if (force) {
      this._account.set(undefined);
      this._identityPromise = null;
    }

    // Return cached promise if identity is already resolving / resolved.
    if (this._identityPromise) {
      return this._identityPromise;
    }

    // Already resolved synchronously – return immediately.
    const current = this._account();
    if (current !== undefined) {
      return Promise.resolve(current ?? null);
    }

    this._identityPromise = this.http
      .get<Account>('api/account')
      .toPromise()
      .then((account) => {
        this._account.set(account ?? null);
        this._authenticated.set(true);
        return account ?? null;
      })
      .catch(() => {
        this._account.set(null);
        this._authenticated.set(false);
        return null;
      });

    return this._identityPromise;
  }

  /** Manually set the identity (e.g. after login). */
  authenticate(account: Account | null): void {
    this._account.set(account);
    this._authenticated.set(account !== null);
    this._identityPromise = null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Authority helpers
  // ══════════════════════════════════════════════════════════════════════════

  hasAnyAuthority(roles: string[]): boolean {
    if (!this._authenticated()) return false;
    const userRoles = this._account()?.authorities ?? [];
    return roles.some((r) => userRoles.includes(r));
  }

  hasAuthority(role: string): boolean {
    return this.hasAnyAuthority([role]);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Authentication
  // ══════════════════════════════════════════════════════════════════════════

  login(credentials: LoginCredentials): Observable<Account | null> {
    const body =
      `j_username=${encodeURIComponent(credentials.username)}` +
      `&j_password=${encodeURIComponent(credentials.password)}` +
      `&remember-me=${credentials.rememberMe}&submit=Login`;

    return this.http
      .post('api/authentication', body, {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
      .pipe(
        switchMap(() => from(this.identity(true))),
        tap((account) => {
          // Legacy kept language fixed to 'fr' – honour that behaviour.
          this.authenticate(account);
        }),
        catchError((err) => {
          this.authenticate(null);
          return throwError(() => err);
        })
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>('api/logout', null).pipe(
      tap(() => {
        this.authenticate(null);
        this._identityPromise = null;
      }),
      catchError(() => {
        // Always clear local state even if the server call fails.
        this.authenticate(null);
        this._identityPromise = null;
        return EMPTY;
      }),
      switchMap(() => this.http.get<void>('api/account').pipe(catchError(() => EMPTY)))
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Account management
  // ══════════════════════════════════════════════════════════════════════════

  getAccount(): Observable<Account> {
    return this.http.get<Account>('api/account');
  }

  updateAccount(account: Account): Observable<Account> {
    return this.http.post<Account>('api/account', account).pipe(
      tap((updated) => this.authenticate(updated))// ← met à jour le signal
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Registration & Activation
  // ══════════════════════════════════════════════════════════════════════════

  register(account: Partial<Account> & { password: string }): Observable<void> {
    return this.http.post<void>('api/register', account);
  }

  activateAccount(key: string): Observable<void> {
    return this.http.get<void>('api/activate', { params: { key } });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Password
  // ══════════════════════════════════════════════════════════════════════════

  changePassword(payload: ChangePassword): Observable<void> {
    return this.http.post<void>('api/account/change_password', payload);
  }

  resetPasswordInit(mail: string): Observable<void> {
    return this.http.post<void>('api/account/reset_password/init', mail, {
      headers: new HttpHeaders({ 'Content-Type': 'text/plain' }),
    });
  }

  resetPasswordFinish(payload: PasswordResetFinish): Observable<void> {
    return this.http.post<void>('api/account/reset_password/finish', payload);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Contact
  // ══════════════════════════════════════════════════════════════════════════

  sendContactEmail(contact: ContactPayload): Observable<void> {
    return this.http.post<void>('api/contact', contact);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Navigation state helpers  (replaces $sessionStorage.previousState)
  // ══════════════════════════════════════════════════════════════════════════

  storePreviousState(name: string, params?: Record<string, unknown>): void {
    this._previousState = { name, params };
  }

  getPreviousState(): PreviousState | null {
    return this._previousState;
  }

  resetPreviousState(): void {
    this._previousState = null;
  }
}
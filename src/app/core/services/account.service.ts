import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Account } from '../models/account.model';

/**
 * Thin HTTP wrapper for the /api/account endpoint.
 * Higher-level logic (identity caching, signals) lives in AuthService.
 */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);

  /** Fetch the current user's account details. */
  get(): Observable<Account> {
    return this.http.get<Account>('api/account');
  }

  /** Persist updated account details. */
  save(account: Partial<Account>): Observable<Account> {
    return this.http.post<Account>('api/account', account);// ne met pas à jour le signal inexistant dans la legacy
  }
}
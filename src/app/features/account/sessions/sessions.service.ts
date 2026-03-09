import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserSession {
  series:            string;
  ipAddress:         string;
  userAgent:         string;
  formattedTokenDate: string;
}

/**
 * SessionsService
 *
 * Migré depuis le service `$resource` utilisé dans `SessionsController`.
 * Endpoints : GET api/account/sessions (getAll) + DELETE api/account/sessions/:series
 */
@Injectable({ providedIn: 'root' })
export class SessionsService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<UserSession[]> {
    return this.http.get<UserSession[]>('api/account/sessions');
  }

  delete(series: string): Observable<void> {
    return this.http.delete<void>(`api/account/sessions/${encodeURIComponent(series)}`);
  }
}

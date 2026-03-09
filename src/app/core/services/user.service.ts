import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id?:           number;
  login:         string;
  firstName?:    string;
  lastName?:     string;
  email?:        string;
  activated?:    boolean;
  langKey?:      string;
  authorities?:  string[];
  createdBy?:    string;
  createdDate?:  string;
  lastModifiedBy?:   string;
  lastModifiedDate?: string;
}

export interface UserPage {
  users:      User[];
  totalItems: number;
}

/**
 * UserService
 *
 * Migré depuis `User` factory (user.service.js) basée sur `$resource`.
 *
 * Méthodes portées :
 *  - `query(params?)`   → GET  api/users         (liste paginée)
 *  - `get(login)`       → GET  api/users/:login   (détail)
 *  - `save(user)`       → POST api/users          (création)
 *  - `update(user)`     → PUT  api/users          (modification)
 *  - `delete(login)`    → DELETE api/users/:login
 *
 * `transformResponse: angular.fromJson` → supprimé (HttpClient parse JSON nativement).
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  query(params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<User[]> {
    let httpParams = new HttpParams();
    if (params?.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params?.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params?.sort)               httpParams = httpParams.set('sort', params.sort);

    return this.http.get<User[]>('api/users', { params: httpParams });
  }

  get(login: string): Observable<User> {
    return this.http.get<User>(`api/users/${login}`);
  }

  save(user: Partial<User>): Observable<User> {
    return this.http.post<User>('api/users', user);
  }

  update(user: Partial<User>): Observable<User> {
    return this.http.put<User>('api/users', user);
  }

  delete(login: string): Observable<void> {
    return this.http.delete<void>(`api/users/${login}`);
  }

  /** Alias pour cohérence avec le legacy — utilisé dans certains controllers. */
  getAuthorities(): Observable<string[]> {
    return this.http.get<string[]>('api/users/authorities');
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { formatDate } from '@angular/common';

/** Entité EDoc complète (pour les écrans ADMIN : detail, dialog, delete). */
export interface EDoc {
  id?:             number;
  receiverCode?:   string;
  documentNumber:  string;
  documentType:    string;
  dateProcess?:    Date | null;
  dateDocument?:   Date | null;
  amountTax?:      number;
  amount?:         number;
  generatedRef?:   string;
  processStatus?:  string;
  partnerBySenderCode?: { id: number };
  income?:         { id: number };
}

/** Paramètres de pagination pour la liste EDoc (e-doc.state.js pagingParams). */
export interface EDocPageParams {
  page?:      number;
  size?:      number;
  sort?:      string | string[];
}

/**
 * EDocService
 *
 * Migré depuis `EDoc` factory (e-doc.service.js) + `EDocSearch` factory (e-doc.search.service.js).
 *
 * - `$resource` → `HttpClient`
 * - `DateUtils.convertLocalDateFromServer/ToServer` → `formatDate()` Angular (LOCALE_ID 'fr')
 * - `angular.fromJson / toJson` → JSON.parse / JSON.stringify natifs (inutiles avec HttpClient)
 * - `transformRequest / transformResponse` → `pipe(map(...))` RxJS
 * - `EDocSearch.$resource('api/_search/e-docs')` fusionné ici comme `search()`
 *
 * Méthodes portées :
 *  - query(params)                 → GET  api/e-docs          (liste paginée avec headers)
 *  - get(id)                       → GET  api/e-docs/:id
 *  - save(eDoc)                    → POST api/e-docs          (isArray: true → EDoc[])
 *  - update(eDoc)                  → PUT  api/e-docs
 *  - delete(id)                    → DELETE api/e-docs/:id
 *  - search(params, criteria)      → POST api/e-docs/search   (ex EDocSearch + critères)
 */
@Injectable({ providedIn: 'root' })
export class EDocService {
  private readonly http = inject(HttpClient);

  query(params: EDocPageParams): Observable<HttpResponse<EDoc[]>> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sort) {
      const sorts = Array.isArray(params.sort) ? params.sort : [params.sort];
      sorts.forEach(s => { httpParams = httpParams.append('sort', s); });
    }
    return this.http.get<EDoc[]>('api/e-docs', {
      params: httpParams,
      observe: 'response',
    }).pipe(
      map(resp => {
        const body = resp.body?.map(d => this._fromServer(d)) ?? [];
        return resp.clone({ body });
      })
    );
  }

  get(id: number): Observable<EDoc> {
    return this.http.get<EDoc>(`api/e-docs/${id}`).pipe(
      map(d => this._fromServer(d))
    );
  }

  save(eDoc: Partial<EDoc>): Observable<EDoc[]> {
    return this.http.post<EDoc[]>('api/e-docs', this._toServer(eDoc));
  }

  update(eDoc: Partial<EDoc>): Observable<EDoc> {
    return this.http.put<EDoc>('api/e-docs', this._toServer(eDoc));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`api/e-docs/${id}`);
  }

  /**
   * Recherche POST avec critères + pagination.
   * Remplace EDocSearch factory (api/_search/e-docs) + EDoc.search().
   * L'implémentation legacy utilisait POST api/e-docs avec isArray:true.
   */
  search(
    params: EDocPageParams,
    criteria: Record<string, unknown>
  ): Observable<HttpResponse<EDoc[]>> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sort) {
      const sorts = Array.isArray(params.sort) ? params.sort : [params.sort];
      sorts.forEach(s => { httpParams = httpParams.append('sort', s); });
    }
    return this.http.post<EDoc[]>('api/e-docs', criteria, {
      params: httpParams,
      observe: 'response',
    });
  }

  // ── Date conversion (remplace DateUtils du legacy) ─────────────────────────

  private _fromServer(data: EDoc): EDoc {
    return {
      ...data,
      dateProcess:  data.dateProcess  ? this._parseLocalDate(String(data.dateProcess))  : null,
      dateDocument: data.dateDocument ? this._parseLocalDate(String(data.dateDocument)) : null,
    };
  }

  private _toServer(data: Partial<EDoc>): Partial<EDoc> {
    return {
      ...data,
      dateProcess:  data.dateProcess  ? (this._formatLocalDate(data.dateProcess)  as any) : null,
      dateDocument: data.dateDocument ? (this._formatLocalDate(data.dateDocument) as any) : null,
    };
  }

  /**
   * Convertit 'yyyy-MM-dd' → Date en évitant le décalage UTC.
   * Remplace DateUtils.convertLocalDateFromServer.
   */
  private _parseLocalDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /**
   * Formate une Date → 'yyyy-MM-dd' pour l'envoi serveur.
   * Remplace DateUtils.convertLocalDateToServer.
   */
  private _formatLocalDate(date: Date | null | undefined): string | null {
    if (!date) return null;
    return formatDate(date, 'yyyy-MM-dd', 'fr');
  }
}
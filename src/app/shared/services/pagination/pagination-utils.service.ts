import { Injectable } from '@angular/core';

/**
 * PaginationUtilsService
 *
 * Migré depuis `PaginationUtil` factory (pagination-util.service.js).
 *
 * Utilisé pour parser les queryParams de pagination issus du router :
 *  - `sort=id,asc`  → predicate='id', ascending=true
 *  - `sort=id,desc` → predicate='id', ascending=false
 *  - `sort=_score`  → predicate='_score' (recherche Elasticsearch)
 *
 * Toutes les méthodes sont portées à l'identique.
 */
@Injectable({ providedIn: 'root' })
export class PaginationUtilsService {

  /**
   * Extrait le flag ascending depuis une valeur `sort` comme `'id,asc'` ou `'id,desc'`.
   * Si pas de direction → true par défaut (miroir du legacy).
   */
  parseAscending(sort: string): boolean {
    const parts = sort.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 1] === 'asc';
    }
    return true;
  }

  /**
   * Parse le numéro de page (string → number).
   * Les queryParams Angular sont des strings.
   */
  parsePage(page: string | number): number {
    return parseInt(String(page), 10);
  }

  /**
   * Extrait le predicate depuis `'id,asc'` → `'id'`
   * ou `'firstName,lastName,asc'` → `'firstName,lastName'`.
   */
  parsePredicate(sort: string): string {
    const parts = sort.split(',');
    if (parts.length > 1) {
      parts.pop();
    }
    return parts.join(',');
  }
}

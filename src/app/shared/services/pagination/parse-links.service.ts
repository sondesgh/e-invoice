import { Injectable } from '@angular/core';

/**
 * Résultat du parsing d'un header `Link` HTTP.
 *
 * Clés standard RFC 5988 : `first`, `prev`, `next`, `last`.
 * La valeur est le numéro de page extrait du query-param `page`.
 */
export type LinkRelation = 'first' | 'prev' | 'next' | 'last' | string;
export type ParsedLinks  = Record<LinkRelation, number>;

/**
 * ParseLinksService
 *
 * Port direct de l'AngularJS `ParseLinks` factory (parse-links.service.js).
 *
 * Parse le header HTTP `Link` au format RFC 5988 retourné par les API
 * JHipster / Spring Data pour la pagination :
 *
 * ```
 * Link: <http://host/api/errors?page=0&size=20>; rel="first",
 *       <http://host/api/errors?page=1&size=20>; rel="next"
 * ```
 *
 * Usage dans un composant :
 * ```ts
 * const parseLinks = inject(ParseLinksService);
 *
 * this.http.get<T[]>('/api/errors', { observe: 'response' }).subscribe(res => {
 *   this.links      = parseLinks.parse(res.headers.get('link') ?? '');
 *   this.totalItems = Number(res.headers.get('X-Total-Count'));
 * });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ParseLinksService {

  /**
   * Parse un header `Link` et retourne un dictionnaire `{ rel → page }`.
   *
   * Lève une erreur si le header est vide ou malformé (miroir exact du legacy).
   *
   * @param header  Valeur brute du header `Link`
   * @returns       Dictionnaire { 'first' | 'prev' | 'next' | 'last' → numéro de page }
   */
  parse(header: string): ParsedLinks {
    if (header.length === 0) {
      throw new Error('input must not be of zero length');
    }

    // Découpe par virgule → chaque partie = un lien
    const parts = header.split(',');
    const links: ParsedLinks = {} as ParsedLinks;

    for (const part of parts) {
      const section = part.split(';');

      if (section.length !== 2) {
        throw new Error('section could not be split on ";"');
      }

      // Extrait l'URL entre < >
      const url = section[0].replace(/<(.*)>/, '$1').trim();

      // Extrait le query-param `page` depuis l'URL
      const page = this._extractPage(url);

      // Extrait le nom de la relation (rel="next" → "next")
      const rel = section[1].replace(/rel="(.*)"/, '$1').trim();

      links[rel] = page;
    }

    return links;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * Extrait la valeur du paramètre `page` depuis une URL.
   * Miroir de la regex queryString du legacy.
   */
  private _extractPage(url: string): number {
    const queryString: Record<string, string> = {};

    url.replace(
      /([^?=&]+)(=([^&]*))?/g,
      (_$0, $1: string, _$2: string, $3: string) => {
        queryString[$1] = $3;
        return '';
      }
    );

    const page = queryString['page'];
    return typeof page === 'string' ? parseInt(page, 10) : 0;
  }
}

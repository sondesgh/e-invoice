import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * multi-translate-loader.ts
 *
 * Remplace `$translatePartialLoader` du legacy AngularJS.
 *
 * Le legacy chargeait les traductions en plusieurs fichiers JSON séparés par
 * « partie » fonctionnelle (global, login, eDoc, connexion…) via :
 *   urlTemplate: 'i18n/{lang}/{part}.json'
 *
 * Ce loader charge en parallèle TOUS les fichiers d'une langue et les fusionne
 * en un seul objet plat, ce qui donne le même résultat qu'un $translatePartialLoader
 * avec toutes les parties pré-chargées.
 *
 * Utilisation dans app.config.ts :
 * ```ts
 * TranslateModule.forRoot({
 *   defaultLanguage: 'fr',
 *   loader: {
 *     provide:    TranslateLoader,
 *     useFactory: multiTranslateLoaderFactory,
 *     deps:       [HttpClient],
 *   },
 * })
 * ```
 */

/**
 * Liste de toutes les « parties » i18n — correspond EXACTEMENT aux fichiers JSON
 * présents dans src/assets/i18n/{lang}/.
 *
 * ⚠️  Noms sensibles à la casse — doivent correspondre exactement aux noms de fichiers.
 *
 * Fichiers absents ar :
 *   amountRef.json          
 *   blockManagement.json   
 *   signInvoices.json       
 *   testInvoice.json       
 */
export const I18N_PARTS: string[] = [
  'acknowlegment',        //  orthographe legacy : sans 'e' (acknowLEDGment → acknowLEGment)
  'activate',
  'addInvoice',
  'addInvoicee',
  'amountRef',            
  'attachementIn',
  'attachementOut',
  'audits',
  'authority',
  'blockManagement',     
  'configuration',
  'connexion',           
  'consultInvoice',
  'country',
  'devise',
  'eDoc',
  'error',
  'firstpage',            
  'gateway',
  'global',
  'health',
  'home',
  'importInvoice',
  'income',
  'login',
  'logs',
  'metrics',
  'outcome',
  'partner',
  'password',
  'receiverMailing',
  'register',
  'reset',
  'schemaVersion',
  'sessions',
  'settings',
  'signatory',
  'signInvoices',        
  'social',
  'testInvoice',          
  'tradenetAccount',
  'user-management',
];

/**
 * Deep-merge de deux objets (sans dépendance externe).
 * Les clés de `source` écrasent celles de `target` à chaque niveau.
 */
function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      typeof output[key] === 'object' &&
      output[key] !== null &&
      !Array.isArray(output[key])
    ) {
      output[key] = deepMerge(output[key] as Record<string, any>, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

/**
 * MultiTranslateLoader — charge et fusionne tous les fichiers i18n/{lang}/*.json.
 *
 * Les fichiers manquants (404) sont silencieusement ignorés grâce à `catchError`,
 * ce qui permet de déployer en ajoutant des parties au fur et à mesure.
 */
export class MultiTranslateLoader implements TranslateLoader {
  constructor(
    private readonly http: HttpClient,
    private readonly prefix: string = 'assets/i18n/',
    private readonly suffix: string = '.json',
    private readonly parts: string[] = I18N_PARTS,
  ) {}

  getTranslation(lang: string): Observable<Record<string, any>> {
    const requests: Observable<Record<string, any>>[] = this.parts.map(part =>
      this.http
        .get<Record<string, any>>(`${this.prefix}${lang}/${part}${this.suffix}`)
        .pipe(catchError(() => of({})))  // fichier absent → objet vide, pas d'erreur
    );

    return forkJoin(requests).pipe(
      map(results => results.reduce(
        (merged, partial) => deepMerge(merged, partial),
        {} as Record<string, any>
      ))
    );
  }
}

/**
 * Factory function pour l'injection Angular.
 *
 * ```ts
 * loader: {
 *   provide:    TranslateLoader,
 *   useFactory: multiTranslateLoaderFactory,
 *   deps:       [HttpClient],
 * }
 * ```
 */
export function multiTranslateLoaderFactory(http: HttpClient): MultiTranslateLoader {
  return new MultiTranslateLoader(http);
}
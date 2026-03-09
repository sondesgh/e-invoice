import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * SignService
 *
 * Migré depuis `SignService` factory (sign-service.js).
 *
 * Communique avec l'agent de signature local (sigAgent) sur 127.0.0.1:20200.
 * Ce service est appelé lors du flux d'authentification par carte (ROLE_SUPER_USER)
 * et lors de la signature électronique des factures.
 *
 * Méthodes portées :
 *  - `getCertificat(store, connect)` → GET  http://127.0.0.1:20200/sigAgent/getCertificat/:store/:connect
 *  - `getStatus()`                   → GET  http://127.0.0.1:20200/sigAgent/status
 *  - `sign(teif)`                    → POST http://127.0.0.1:20200/sigAgent/sign
 *
 * Note : le port local (20200) peut être configuré via environment.ts si nécessaire.
 */
@Injectable({ providedIn: 'root' })
export class SignService {
  private readonly http = inject(HttpClient);

  private readonly SIG_URL = 'http://127.0.0.1:20200/sigAgent';

  /**
   * Récupère le certificat de la carte à puce.
   * @param store   true = stocker le certificat
   * @param connect true = établir la connexion
   */
  getCertificat(store: boolean, connect: boolean): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.SIG_URL}/getCertificat/${store}/${connect}`
    );
  }

  /** Vérifie que l'agent de signature local est disponible. */
  getStatus(): Observable<unknown> {
    return this.http.get(`${this.SIG_URL}/status`);
  }

  /**
   * Signe un document TEIF.
   * @param teif Contenu XML à signer
   */
  sign(teif: unknown): Observable<unknown> {
    return this.http.post(`${this.SIG_URL}/sign`, teif);
  }
}

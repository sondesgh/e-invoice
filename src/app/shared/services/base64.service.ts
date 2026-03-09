import { Injectable } from '@angular/core';

/**
 * Base64Service
 *
 * Migré depuis `Base64` factory (base64.service.js).
 *
 * Le legacy implémentait encode/decode manuellement (algorithme bitwise custom).
 * En Angular 19 / navigateurs modernes, les APIs natives `btoa()` / `atob()`
 * couvrent exactement le même besoin — plus fiables, plus rapides, sans dépendance.
 *
 * Différence notable sur `decode()` : le legacy ne retournait rien (`output`
 * était calculé mais la fonction n'avait pas de `return`) — c'était un bug.
 * Corrigé ici : `decode()` retourne bien la chaîne décodée.
 *
 * Usage :
 * ```ts
 * const b64Service = inject(Base64Service);
 * const encoded = b64Service.encode('hello');   // 'aGVsbG8='
 * const decoded = b64Service.decode('aGVsbG8='); // 'hello'
 * ```
 */
@Injectable({ providedIn: 'root' })
export class Base64Service {

  /**
   * Encode une chaîne en Base64.
   * Miroir de `Base64.encode(input)`.
   */
  encode(input: string): string {
    return btoa(unescape(encodeURIComponent(input)));
  }

  /**
   * Décode une chaîne Base64.
   * Miroir de `Base64.decode(input)` — avec correction du bug de retour manquant.
   * Les caractères non-Base64 sont filtrés (comme dans le legacy).
   */
  decode(input: string): string {
    const cleaned = input.replace(/[^A-Za-z0-9+/=]/g, '');
    return decodeURIComponent(escape(atob(cleaned)));
  }
}
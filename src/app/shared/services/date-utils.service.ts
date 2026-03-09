import { Injectable } from '@angular/core';
import { formatDate } from '@angular/common';

/**
 * DateUtilsService
 *
 * Migré depuis `DateUtils` factory (date-util.service.js).
 *
 * - `$filter('date')(date, 'yyyy-MM-dd')` → `formatDate()` d'Angular (même format)
 * - Toutes les méthodes sont portées à l'identique.
 */
@Injectable({ providedIn: 'root' })
export class DateUtilsService {

  /** Convertit une date ISO du serveur en objet Date (ou null). */
  convertDateTimeFromServer(date: string | null | undefined): Date | null {
    return date ? new Date(date) : null;
  }

  /**
   * Convertit une date locale `yyyy-MM-dd` du serveur en Date locale.
   * Évite le décalage UTC en construisant la date avec les composants year/month/day.
   */
  convertLocalDateFromServer(date: string | null | undefined): Date | null {
    if (!date) return null;
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Convertit un objet Date en chaîne `yyyy-MM-dd` pour l'envoi au serveur.
   * Remplace `$filter('date')(date, 'yyyy-MM-dd')`.
   */
  convertLocalDateToServer(date: Date | null | undefined): string | null {
    if (!date) return null;
    return formatDate(date, 'yyyy-MM-dd', 'fr');
  }

  /** Format de date utilisé dans l'application. */
  dateformat(): string {
    return 'yyyy-MM-dd';
  }
}

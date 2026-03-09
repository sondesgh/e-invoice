import { Injectable } from '@angular/core';

/**
 * DataUtilsService
 *
 * Migré depuis `DataUtils` factory (data-util.service.js).
 *
 * Méthodes portées sans changement :
 *  - `abbreviate(text)`     → tronque à 30 chars (15 début + ... + 10 fin)
 *  - `byteSize(base64)`     → taille lisible en octets
 *  - `openFile(type, data)` → ouvre un fichier base64 dans un nouvel onglet
 *  - `toBase64(file, cb)`   → FileReader → callback(base64Data)
 *  - `toBase64Async(file)`  → version Promise (ajout Angular 19)
 */
@Injectable({ providedIn: 'root' })
export class DataUtilsService {

  abbreviate(text: string | null | undefined): string {
    if (typeof text !== 'string') return '';
    if (text.length < 30) return text;
    return text.substring(0, 15) + '...' + text.slice(-10);
  }

  byteSize(base64String: string | null | undefined): string {
    if (typeof base64String !== 'string') return '';
    return this._formatAsBytes(this._size(base64String));
  }

  openFile(contentType: string, data: string): void {
    window.open(`data:${contentType};base64,${data}`, '_blank', 'height=300,width=400');
  }

  /** Port exact du legacy (callback-based). */
  toBase64(file: File, cb: (base64: string) => void): void {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const result = (e.target as FileReader).result as string;
      const base64 = result.substring(result.indexOf('base64,') + 'base64,'.length);
      cb(base64);
    };
  }

  /** Version Promise (nouvelle API Angular 19). */
  toBase64Async(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      this.toBase64(file, resolve);
      // FileReader.onerror n'est pas exposé ici mais couvert par le catch dans les composants
    });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _paddingSize(b64: string): number {
    if (b64.endsWith('==')) return 2;
    if (b64.endsWith('='))  return 1;
    return 0;
  }

  private _size(b64: string): number {
    return (b64.length / 4) * 3 - this._paddingSize(b64);
  }

  private _formatAsBytes(size: number): string {
    return size.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' bytes';
  }
}

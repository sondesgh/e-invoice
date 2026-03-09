import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '@core/services/notification.service';

/**
 * HomeComponent
 *
 * Migré depuis `HomeController` + `home.html`.
 *
 * - `Principal.identity()` → `authService.account()` (signal computed)
 * - `$scope.$on('authenticationSuccess')` → supprimé : le signal réagit automatiquement
 * - `FileSaver.saveAs()` → `URL.createObjectURL()` natif (identique FirstpageComponent)
 * - `window.navigator.msSaveOrOpenBlob` (IE legacy) → supprimé (IE non supporté Angular 19)
 *
 * Route : /home  (authorities: ROLE_USER, ROLE_SUPER_USER, ROLE_ADMIN, ROLE_SUPPORT)
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly authService  = inject(AuthService);
  private readonly alertService = inject(AlertService);
  private readonly http         = inject(HttpClient);

  readonly account         = computed(() => this.authService.account());
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  /** Télécharge un document par son identifiant serveur. */
  download(document: string, name: string): void {
    this.http
      .get(`api/download/${document}`, { responseType: 'arraybuffer' })
      .subscribe({
        next: (data) => this._saveAs(data, name, 'application/octet-stream'),
        error: () => this.alertService.error('Erreur lors du téléchargement'),
      });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _saveAs(data: ArrayBuffer, filename: string, mimeType: string): void {
    const blob = new Blob([data], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

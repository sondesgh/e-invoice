import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

/**
 * DocumentationComponent
 *
 * Migré depuis `DocumentationCtrl` (documentation.controller.js).
 *
 * Fournit deux téléchargements de documents techniques :
 *  - `downloadXsd()`     → GET api/downloadXsd        → facture_INVOIC.xsd
 *  - `downloadAllDocs()` → GET api/downloadAllDocs     → documentElfatoora.rar
 *
 * `FileSaver.saveAs()` (lib AngularJS) → remplacé par l'API native
 * `URL.createObjectURL()` + `<a>.click()` (même comportement, zéro dépendance).
 *
 * Route : utilisé comme page standalone ou section dans home/admin.
 * Authorities : à définir selon le contexte (souvent ROLE_USER ou public).
 */
@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="wrapper1">
      <section class="bg-transparent">
        <div class="row">
          <div class="col-md-12">
            <br /><br />

            <div class="row">
              <div class="col-sm-12 form-box">
                <div class="form-bottom">

                  <h2 translate="global.menu.admin.docs">Documentation</h2>
                  <hr />

                  <!-- Erreur de téléchargement -->
                  @if (downloadError()) {
                    <div class="alert alert-danger">
                      <strong>Erreur lors du téléchargement.</strong> {{ downloadError() }}
                    </div>
                  }

                  <div class="row" style="margin-top: 1.5rem;">

                    <!-- XSD -->
                    <div class="col-md-4">
                      <div class="panel panel-default">
                        <div class="panel-heading">
                          <h4 class="panel-title">Schéma XSD Facture</h4>
                        </div>
                        <div class="panel-body">
                          <p>Schéma de validation XML de la facture électronique.</p>
                          <button
                            class="btn btn-primary"
                            [disabled]="isDownloadingXsd()"
                            (click)="downloadXsd()"
                          >
                            @if (isDownloadingXsd()) {
                              <span class="glyphicon glyphicon-refresh spinning"></span> Téléchargement…
                            } @else {
                              <span class="glyphicon glyphicon-download-alt"></span> Télécharger XSD
                            }
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Tous les docs -->
                    <div class="col-md-4">
                      <div class="panel panel-default">
                        <div class="panel-heading">
                          <h4 class="panel-title">Documentation complète</h4>
                        </div>
                        <div class="panel-body">
                          <p>Archive de toute la documentation technique du projet.</p>
                          <button
                            class="btn btn-success"
                            [disabled]="isDownloadingDocs()"
                            (click)="downloadAllDocs()"
                          >
                            @if (isDownloadingDocs()) {
                              <span class="glyphicon glyphicon-refresh spinning"></span> Téléchargement…
                            } @else {
                              <span class="glyphicon glyphicon-download-alt"></span> Télécharger tout
                            }
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .spinning {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `],
})
export class DocumentationComponent {
  private readonly http = inject(HttpClient);

  readonly isDownloadingXsd  = signal(false);
  readonly isDownloadingDocs = signal(false);
  readonly downloadError     = signal<string | null>(null);

  /**
   * Télécharge le schéma XSD.
   * Miroir de `$scope.downloadXsd()` → FileSaver.saveAs(..., 'facture_INVOIC.xsd')
   */
  downloadXsd(): void {
    this.isDownloadingXsd.set(true);
    this.downloadError.set(null);

    this.http
      .get('api/downloadXsd', { responseType: 'arraybuffer' })
      .subscribe({
        next: (data) => {
          this._saveAs(data, 'facture_INVOIC.xsd', 'application/octet-stream');
          this.isDownloadingXsd.set(false);
        },
        error: (err) => {
          this.downloadError.set(err?.message ?? 'Erreur réseau');
          this.isDownloadingXsd.set(false);
        },
      });
  }

  /**
   * Télécharge toute la documentation.
   * Miroir de `$scope.downloadAllDocs()` → FileSaver.saveAs(..., 'documentElfatoora.rar')
   */
  downloadAllDocs(): void {
    this.isDownloadingDocs.set(true);
    this.downloadError.set(null);

    this.http
      .get('api/downloadAllDocs', { responseType: 'arraybuffer' })
      .subscribe({
        next: (data) => {
          this._saveAs(data, 'documentElfatoora.rar', 'application/octet-stream');
          this.isDownloadingDocs.set(false);
        },
        error: (err) => {
          this.downloadError.set(err?.message ?? 'Erreur réseau');
          this.isDownloadingDocs.set(false);
        },
      });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * Déclenche le téléchargement du fichier côté navigateur.
   * Remplace `FileSaver.saveAs()` (bibliothèque AngularJS tierce)
   * par l'API native `URL.createObjectURL()` + `<a>.click()`.
   */
  private _saveAs(
    data: ArrayBuffer,
    filename: string,
    mimeType: string
  ): void {
    const blob = new Blob([data], { type: mimeType });
    const url  = (window.URL || window.webkitURL).createObjectURL(blob);
    const link = document.createElement('a');

    link.href     = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Libère la mémoire après le clic
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

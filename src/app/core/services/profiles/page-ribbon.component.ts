import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileService } from '@core/services/profiles/profile.service';

/**
 * PageRibbonComponent
 *
 * Migré depuis `pageRibbon` directive (page-ribbon.directive.js).
 *
 * Affiche un ruban coloré en haut de page indiquant l'environnement
 * (dev, staging…) quand `ribbonEnv` est défini dans l'API profile-info.
 *
 * Usage dans le layout shell :
 * ```html
 * <app-page-ribbon />
 * ```
 *
 * Logique identique : la classe CSS `ribbonEnv` est ajoutée dynamiquement
 * et le ruban est masqué (`hidden`) si aucun environnement n'est défini.
 */
@Component({
  selector: 'app-page-ribbon',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    @if (ribbonEnv()) {
      <div class="ribbon" [class]="ribbonEnv()">
        <a translate="global.ribbon.{{ ribbonEnv() }}">{{ ribbonEnv() }}</a>
      </div>
    }
  `,
})
export class PageRibbonComponent implements OnInit {
  private readonly profileService = inject(ProfileService);

  readonly ribbonEnv = signal<string | undefined>(undefined);

  ngOnInit(): void {
    this.profileService.getProfileInfo().subscribe((info) => {
      this.ribbonEnv.set(info.ribbonEnv);
    });
  }
}

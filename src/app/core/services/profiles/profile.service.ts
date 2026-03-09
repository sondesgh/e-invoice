import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, map } from 'rxjs';

export interface ProfileInfo {
  activeProfiles:   string[];
  ribbonEnv?:       string;
  inProduction:     boolean;
  swaggerDisabled:  boolean;
}

/**
 * ProfileService
 *
 * Migré depuis `ProfileService` factory (profile.service.js).
 *
 * - `$q` + lazy `dataPromise` → `shareReplay(1)` (même effet : un seul appel HTTP)
 * - `angular.isUndefined(dataPromise)` → Observable froid partagé
 * - Résultats exposés via Observable (compatible avec `async` pipe dans templates)
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  private readonly profileInfo$: Observable<ProfileInfo> = this.http
    .get<{
      activeProfiles?: string[];
      ribbonEnv?: string;
    }>('api/profile-info')
    .pipe(
      map((data) => {
        const profiles = data.activeProfiles ?? [];
        return {
          activeProfiles:  profiles,
          ribbonEnv:       data.ribbonEnv,
          inProduction:    profiles.includes('prod'),
          swaggerDisabled: profiles.includes('no-swagger'),
        };
      }),
      shareReplay(1) // cache — remplace le pattern `dataPromise` du legacy
    );

  /** Retourne les infos de profil (mis en cache après le premier appel). */
  getProfileInfo(): Observable<ProfileInfo> {
    return this.profileInfo$;
  }
}

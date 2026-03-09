import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import {
  Router,
  NavigationStart,
  NavigationEnd,
  ActivatedRoute,
} from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { filter, map, switchMap, takeUntil } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { TranslationStorageService } from '../config/translation-storage.provider';
import { environment } from '../../../environments/environment';

/**
 * State handler service.
 *
 * Migrated from `stateHandler` (AngularJS) and `translationHandler`.
 *
 * Responsibilities (mirrors legacy `initialize()`):
 *  1. Guard routes on `NavigationStart` (replaces `$stateChangeStart`).
 *  2. Update the browser `<title>` on `NavigationEnd` (replaces `$stateChangeSuccess`
 *     + `translationHandler.updateTitle`).
 *  3. Sync the active language on each navigation.
 *
 * Initialise once at app root:
 *
 * ```ts
 * // app.component.ts
 * export class AppComponent {
 *   constructor(stateHandler: StateHandlerService) {
 *     stateHandler.initialize();
 *   }
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class StateHandlerService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);
  private readonly authService = inject(AuthService);
  private readonly translationStorage = inject(TranslationStorageService);

  /** Exposes the application version (mirrors $rootScope.VERSION). */
  readonly version = signal<string>(environment.version ?? '');

  private readonly _destroy$ = new Subject<void>();

  initialize(): void {
    this._handleNavigationStart();
    this._handleNavigationEnd();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  /**
   * On NavigationStart:
   *  1. Check external URL flag and hard-redirect if needed.
   *  2. Sync the active translation language.
   *
   * Auth/guard checks are handled declaratively by `authGuard` on each route.
   */
  private _handleNavigationStart(): void {
    this.router.events
      .pipe(
        filter((e): e is NavigationStart => e instanceof NavigationStart),
        takeUntil(this._destroy$)
      )
      .subscribe(() => {
        // Sync language on every navigation (mirrors JhiLanguageService.getCurrent())
        const lang = this.translationStorage.get();
        this.translate.use(lang);
      });
  }

  /**
   * On NavigationEnd:
   *  - Walk the activated route tree to find the deepest `data.pageTitle`.
   *  - Translate the key and update `document.title`.
   *
   * Mirrors `translationHandler.updateTitle(titleKey)`.
   */
  private _handleNavigationEnd(): void {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(() => this._getDeepestChild(this.route)),
        switchMap((child) => {
          const titleKey: string =
            child.snapshot.data?.['pageTitle'] ?? 'global.title';
          return this.translate.get(titleKey);
        }),
        takeUntil(this._destroy$)
      )
      .subscribe((translatedTitle: string) => {
        this.title.setTitle(translatedTitle);
      });
  }

  /** Walks the ActivatedRoute tree to the deepest child. */
  private _getDeepestChild(route: ActivatedRoute): ActivatedRoute {
    let current = route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }
}

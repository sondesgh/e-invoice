import { Injectable, OnDestroy, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, map, switchMap, takeUntil } from 'rxjs/operators';

/**
 * Translation handler.
 *
 * Direct port of the AngularJS `translationHandler` factory.
 *
 * Responsibilities:
 *  1. `initialize()` – subscribes to translation-change events and refreshes
 *     the window title (replaces `$translateChangeSuccess` listener).
 *  2. `updateTitle(key?)` – translates a title key and sets `document.title`
 *     (same signature as the legacy method).
 *
 * NOTE: `StateHandlerService` already calls `updateTitle` automatically on
 * every `NavigationEnd`. Use this service directly only when you need to
 * imperatively override the page title (e.g. after a lazy route loads data).
 */
@Injectable({ providedIn: 'root' })
export class TranslationHandlerService implements OnDestroy {
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly _destroy$ = new Subject<void>();

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Subscribes to language-change events and updates the page title.
   * Mirrors legacy `initialize()`.
   */
  initialize(): void {
    this.translate.onLangChange
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.updateTitle());
  }

  /**
   * Translates `titleKey` (or resolves it from the current route) and sets
   * `document.title`.
   *
   * Precedence (mirrors legacy):
   *  1. `titleKey` parameter
   *  2. Current route `data.pageTitle`
   *  3. `'global.title'`
   */
  updateTitle(titleKey?: string): void {
    const key = titleKey ?? this._currentRouteTitle() ?? 'global.title';
    this.translate.get(key).subscribe((translated: string) => {
      this.title.setTitle(translated);
    });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private _currentRouteTitle(): string | undefined {
    let current = this.route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current.snapshot.data?.['pageTitle'];
  }
}

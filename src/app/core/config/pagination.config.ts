/**
 * Pagination configuration.
 *
 * Migrated from:
 *  - `uib-pager.config.js`      (simple prev/next pager)
 *  - `uib-pagination.config.js` (full pagination with boundary links)
 *
 * The AngularUI Bootstrap `uib-pagination` component has no Angular 19
 * equivalent in the same library. Use `ngb-pagination` from @ng-bootstrap
 * or Angular Material's `<mat-paginator>`.
 *
 * These constants are shared across all paginator usages in the app
 * and can be injected via the provided `PAGINATION_CONFIG` token.
 */

import { InjectionToken, Provider } from '@angular/core';

export interface PaginationConfig {
  /** Default page size (mirrors paginationConstants.itemsPerPage). */
  itemsPerPage: number;
  /** Maximum number of page buttons shown (mirrors uibPaginationConfig.maxSize). */
  maxSize: number;
  /** Show first / last boundary links. */
  boundaryLinks: boolean;
  /** Navigation labels. */
  labels: {
    first: string;
    previous: string;
    next: string;
    last: string;
  };
}

export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  itemsPerPage: 20,
  maxSize: 5,
  boundaryLinks: true,
  labels: {
    first: '«',
    previous: '‹',
    next: '›',
    last: '»',
  },
};

export const PAGINATION_CONFIG = new InjectionToken<PaginationConfig>(
  'PAGINATION_CONFIG',
  { providedIn: 'root', factory: () => DEFAULT_PAGINATION_CONFIG }
);

/** Drop-in providers for app.config.ts. */
export function providePaginationConfig(
  overrides: Partial<PaginationConfig> = {}
): Provider {
  return {
    provide: PAGINATION_CONFIG,
    useValue: { ...DEFAULT_PAGINATION_CONFIG, ...overrides },
  };
}

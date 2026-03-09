import { inject } from '@angular/core';
import {
  CanActivateFn,
  CanActivateChildFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional route guard – direct replacement for the AngularJS
 * `authorize` logic in auth.service.js.
 *
 * Usage in route config:
 *
 * ```ts
 * {
 *   path: 'admin',
 *   data: { authorities: ['ROLE_ADMIN'] },
 *   canActivate: [authGuard],
 * }
 * ```
 *
 * If `data.authorities` is empty or absent the route is public.
 * If the user is authenticated but lacks the required role → /accessdenied.
 * If the user is not authenticated → /accessdenied (login modal can be opened
 * by the component, or integrate your LoginService here).
 */
export const authGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Promise<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Ensure identity is resolved (mirrors Principal.identity() call).
  const account = await authService.identity();

  const requiredAuthorities: string[] = route.data?.['authorities'] ?? [];

  // Public route – always allow.
  if (requiredAuthorities.length === 0) {
    // Redirect authenticated users away from login / register pages.
    if (account && isAccountRoute(route)) {
      router.navigate(['/home']);
      return false;
    }
    return true;
  }

  // Route requires authentication.
  if (!account) {
    // Stash the intended destination and send to access-denied / login.
    authService.storePreviousState(state.url);
    router.navigate(['/accessdenied']);
    return false;
  }

  // Route requires specific authorities.
  if (!authService.hasAnyAuthority(requiredAuthorities)) {
    router.navigate(['/accessdenied']);
    return false;
  }

  return true;
};

/** Also usable as a child-route guard. */
export const authChildGuard: CanActivateChildFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => authGuard(route, state);

// ── Helpers ─────────────────────────────────────────────────────────────────

function isAccountRoute(route: ActivatedRouteSnapshot): boolean {
  const accountPages = ['login', 'register'];
  let current: ActivatedRouteSnapshot | null = route;
  while (current) {
    if (accountPages.includes(current.routeConfig?.path ?? '')) return true;
    current = current.parent;
  }
  return false;
}
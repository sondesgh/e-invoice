import { Component, OnInit, HostListener, inject, computed } from '@angular/core';
import { CommonModule, registerLocaleData }                  from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeAr from '@angular/common/locales/ar';
import { Router, RouterLink, RouterLinkActive }   from '@angular/router';
import { TranslateModule, TranslateService }      from '@ngx-translate/core';
import { AuthService }                            from '@core/services/auth.service';

interface NavDropdown {
  labelKey:    string;
  icon:        string;
  roles:       string[];
  routePrefix: string;
  items:       NavItem[];
}

interface NavItem {
  labelKey: string;
  icon:     string;
  route:    string;
  roles?:   string[];
}

/**
 * NavbarComponent
 *
 * ──────────────────────────────────────────────────────────────────────────
 * CORRECTIONS
 * ──────────────────────────────────────────────────────────────────────────
 *
 * 1. isAuthenticated était un boolean local initialisé UNE FOIS dans ngOnInit
 *    via auth.identity().then(...).
 *    Problème : identity() est async → au premier rendu, isAuthenticated = false
 *    → le menu "visiteur" s'affiche toujours, même après connexion.
 *    FIX : utiliser le signal authService.isAuthenticated() directement dans
 *    le template via computed() — il se met à jour automatiquement.
 *
 * 2. userRoles idem : computed() depuis authService.authorities().
 *
 * 3. global.menu.invoices.eDoc manquait dans les dropdowns (route /invoice/e-doc).
 *    Ajouté avec rôles ROLE_USER.
 *
 * 4. global.menu.referentiel et ses enfants (devise, country, amountRef) absents.
 *    Ajouté le dropdown Référentiel pour ROLE_ADMIN.
 *
 * 5. Admin dropdown absent du menu connecté. Ajouté pour ROLE_ADMIN.
 */
@Component({
  selector:    'app-navbar',
  standalone:  true,
  imports:     [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrls:   ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit {
  private readonly auth      = inject(AuthService);
  protected readonly router  = inject(Router);
  private readonly translate = inject(TranslateService);

  // ── État UI ────────────────────────────────────────────────────────────
  isCollapsed   = true;
  scrolled      = false;
  openDropdown: string | null = null;

  // ── CORRECTION 1 : signal réactif au lieu d'un boolean local ──────────
  // computed() se met à jour automatiquement quand authService._authenticated change
  readonly isAuthenticated = computed(() => this.auth.isAuthenticated());
  readonly userRoles       = computed(() => this.auth.authorities());

  // ── i18n ───────────────────────────────────────────────────────────────
  currentLang        = 'fr';
  availableLanguages = ['fr', 'ar'];

  // ── Liens publics (visiteur non connecté) ─────────────────────────────
  readonly publicLinks = [
    { labelKey: 'global.menu.home',           anchor: '#slider'  },
    { labelKey: 'global.menu.service',         anchor: '#service' },
    { labelKey: 'global.menu.telechargement',  anchor: '#docs'    },
    { labelKey: 'global.menu.faq',             anchor: '#faq'     },
    { labelKey: 'global.menu.contact',         anchor: '#contact' },
  ];

  // ── Dropdowns menu connecté ────────────────────────────────────────────
  readonly dropdowns: NavDropdown[] = [
    // ── Factures ─────────────────────────────────────────────────────────
    {
      labelKey:    'global.menu.invoices.main',
      icon:        'fa-file-text',
      roles:       ['ROLE_USER', 'ROLE_SUPER_USER', 'ROLE_SUPPORT', 'ROLE_ADMIN'],
      routePrefix: 'invoice',
      items: [
        { labelKey: 'global.menu.invoices.add',       icon: 'fa-pencil',       route: '/invoice/add',     roles: ['ROLE_USER', 'ROLE_SUPER_USER'] },
        { labelKey: 'global.menu.invoices.consult',   icon: 'fa-search',       route: '/invoice/consult'                                          },
        { labelKey: 'global.menu.invoices.import',    icon: 'fa-upload',       route: '/invoice/import',  roles: ['ROLE_USER', 'ROLE_SUPER_USER'] },
        { labelKey: 'global.menu.invoices.importSig', icon: 'fa-pencil-square',route: '/invoice/sign',    roles: ['ROLE_USER', 'ROLE_SUPER_USER'] },
        { labelKey: 'global.menu.invoices.test',      icon: 'fa-check-circle', route: '/invoice/test',    roles: ['ROLE_USER', 'ROLE_SUPER_USER'] },
        { labelKey: 'global.menu.invoices.support',   icon: 'fa-tasks',        route: '/invoice/consult', roles: ['ROLE_SUPPORT', 'ROLE_ADMIN']   },
      ],
    },
    // ── Gestion Utilisateurs ──────────────────────────────────────────────
    {
      labelKey:    'global.menu.entities.main',
      icon:        'fa-users',
      roles:       ['ROLE_ADMIN', 'ROLE_SUPER_USER', 'ROLE_SUPPORT'],
      routePrefix: 'entities',
      items: [
        { labelKey: 'global.menu.entities.partner',          icon: 'fa-asterisk', route: '/entities/partner',          roles: ['ROLE_ADMIN']                   },
        { labelKey: 'global.menu.entities.tradenetAccount',  icon: 'fa-user',     route: '/entities/tradenet-account', roles: ['ROLE_ADMIN', 'ROLE_SUPER_USER'] },
        { labelKey: 'global.menu.entities.signatory',        icon: 'fa-pencil',   route: '/entities/signatory'                                                  },
        { labelKey: 'global.menu.entities.receiverContacts', icon: 'fa-envelope', route: '/entities/receiver-mailing', roles: ['ROLE_ADMIN', 'ROLE_SUPER_USER'] },
        { labelKey: 'global.menu.entities.blockManagement',  icon: 'fa-lock',     route: '/entities/block-management', roles: ['ROLE_ADMIN', 'ROLE_SUPPORT']    },
      ],
    },
    // ── Référentiel ────────────────────────────────────────────────────────
    {
      labelKey:    'global.menu.referentiel',
      icon:        'fa-database',
      roles:       ['ROLE_ADMIN', 'ROLE_SUPER_USER'],
      routePrefix: 'referentiel',
      items: [
        { labelKey: 'global.menu.entities.country',   icon: 'fa-globe',  route: '/referentiel/country', roles: ['ROLE_ADMIN'] },
        { labelKey: 'global.menu.entities.devise',    icon: 'fa-money',  route: '/referentiel/devise',  roles: ['ROLE_ADMIN'] },
        { labelKey: 'global.menu.entities.amountRef', icon: 'fa-list',   route: '/referentiel/amount-ref', roles: ['ROLE_ADMIN'] },
      ],
    },
    // ── Administration ─────────────────────────────────────────────────────
    {
      labelKey:    'global.menu.admin.main',
      icon:        'fa-cogs',
      roles:       ['ROLE_ADMIN'],
      routePrefix: 'admin',
      items: [
        { labelKey: 'global.menu.admin.userManagement', icon: 'fa-user',        route: '/admin/user-management' },
        { labelKey: 'global.menu.admin.audits',         icon: 'fa-bell',        route: '/admin/audits'          },
        { labelKey: 'global.menu.admin.health',         icon: 'fa-medkit',      route: '/admin/health'          },
        { labelKey: 'global.menu.admin.configuration',  icon: 'fa-list',        route: '/admin/configuration'   },
        { labelKey: 'global.menu.admin.logs',           icon: 'fa-tasks',       route: '/admin/logs'            },
        { labelKey: 'global.menu.admin.metrics',        icon: 'fa-bar-chart',   route: '/admin/metrics'         },
      ],
    },
    // ── Documentation ──────────────────────────────────────────────────────
    {
      labelKey:    'global.menu.documentation',
      icon:        'fa-book',
      roles:       [],
      routePrefix: 'documentation',
      items: [
        { labelKey: 'global.menu.documentation', icon: 'fa-book', route: '/documentation' },
      ],
    },
    // ── Compte ─────────────────────────────────────────────────────────────
    {
      labelKey:    'global.menu.account.main',
      icon:        'fa-user-circle',
      roles:       [],
      routePrefix: 'account',
      items: [
        { labelKey: 'global.menu.account.settings', icon: 'fa-cog',  route: '/account/settings' },
        { labelKey: 'global.menu.account.password', icon: 'fa-lock', route: '/account/password' },
        { labelKey: 'global.menu.account.sessions', icon: 'fa-list', route: '/account/sessions' },
      ],
    },
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.currentLang = this.translate.currentLang || 'fr';
    this._applyLocale(this.currentLang);
  }

  // ── Scroll ─────────────────────────────────────────────────────────────
  @HostListener('window:scroll')
  onScroll(): void { this.scrolled = window.scrollY > 70; }

  // ── UI ─────────────────────────────────────────────────────────────────
  toggleNavbar():   void { this.isCollapsed = !this.isCollapsed; }
  collapseNavbar(): void { this.isCollapsed = true; this.openDropdown = null; }

  toggleDropdown(name: string): void {
    this.openDropdown = this.openDropdown === name ? null : name;
  }
  isDropdownOpen(name: string): boolean { return this.openDropdown === name; }

  // ── Auth ───────────────────────────────────────────────────────────────
  login():  void { this.collapseNavbar(); this.router.navigate(['/login']);     }
  logout(): void {
    this.collapseNavbar();
    this.auth.logout().subscribe(() => this.router.navigate(['/firstpage']));
  }

  // ── Rôles ──────────────────────────────────────────────────────────────
  // CORRECTION 2 : lit le signal userRoles() à chaque appel
  hasAnyRole(roles: string[]): boolean {
    if (!roles || roles.length === 0) return true;
    return roles.some(r => this.userRoles().includes(r));
  }

  // ── i18n ───────────────────────────────────────────────────────────────
  changeLanguage(lang: string): void {
    this.translate.use(lang);
    this.currentLang = lang;
    this._applyLocale(lang);
    this.collapseNavbar();
  }
  private _applyLocale(lang: string): void {
    if (lang === 'fr') registerLocaleData(localeFr, 'fr');
    if (lang === 'ar') registerLocaleData(localeAr, 'ar');
  }
  langLabel(lang: string): string {
    return lang === 'fr' ? 'Français' : 'العربية';
  }
}
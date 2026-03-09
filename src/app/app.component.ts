import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet }              from '@angular/router';
import { CommonModule }              from '@angular/common';
import { TranslateModule }           from '@ngx-translate/core';

import { NavbarComponent }       from './shared/layouts/navbar/navbar.component';
import { FooterComponent }       from './shared/layouts/footer/footer.component';
import { PageRibbonComponent }   from './core/services/profiles/page-ribbon.component';
import { StateHandlerService }   from './core/handlers/state.handler';
import { AuthService }           from './core/services/auth.service';


@Component({
  selector:    'app-root',
  standalone:  true,
  imports: [
    RouterOutlet,
    CommonModule,
    TranslateModule,     
    NavbarComponent,
    FooterComponent,
    PageRibbonComponent,
  ],
  template: `
    <app-page-ribbon />
    <app-navbar />
    <main>
      <router-outlet />
    </main>
    <app-footer />
  `,
  styles: [`
    main {
      min-height: calc(100vh - 68px - 220px);
    }
  `]
})
export class AppComponent implements OnInit {
  private readonly stateHandler = inject(StateHandlerService);
  private readonly authService  = inject(AuthService);

  ngOnInit(): void {
    // CORRECTION 2 : initialise la gestion des titres + sync langue au démarrage
    this.stateHandler.initialize();

    //  résout l'identité au démarrage → isAuthenticated() correct
    // dès le premier rendu (nécessaire pour le menu navbar et firstpage)
    this.authService.identity();
  }
}
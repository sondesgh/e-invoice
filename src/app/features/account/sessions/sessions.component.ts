import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { SessionsService, UserSession } from './sessions.service';
import { AuthService } from '../../../core/services/auth.service';
import { Account } from '../../../core/models/account.model';

/**
 * SessionsComponent
 *
 * Migré depuis `SessionsController` + `sessions.html`.
 * Authorities : ROLE_SUPER_USER, ROLE_ADMIN, ROLE_SUPPORT
 */
@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './sessions.component.html',
})
export class SessionsComponent implements OnInit {
  private readonly sessionsService = inject(SessionsService);
  private readonly authService     = inject(AuthService);

  account: Account | null = null;
  sessions: UserSession[] = [];

  readonly success = signal(false);
  readonly error   = signal(false);

  ngOnInit(): void {
    this.authService.identity().then((acc) => (this.account = acc));
    this.loadSessions();
  }

  loadSessions(): void {
    this.sessionsService.getAll().subscribe((data) => (this.sessions = data));
  }

  invalidate(series: string): void {
    this.sessionsService.delete(series).subscribe({
      next: () => {
        this.error.set(false);
        this.success.set(true);
        this.loadSessions();
      },
      error: () => {
        this.success.set(false);
        this.error.set(true);
      },
    });
  }
}

import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/**
 * WebsockListenerService
 *
 * Migré depuis `WebsockListenerService` factory (websock-listener-service.js).
 *
 * Se connecte via STOMP over SockJS à l'agent de signature local
 * sur ws://127.0.0.1:8787/certificat pour recevoir les résultats de
 * lecture de certificat de manière asynchrone.
 *
 * NOTE : Ce service dépend des bibliothèques globales `SockJS` et `Stomp`
 * chargées via les scripts dans `angular.json` (ou index.html).
 * S'assurer que `sockjs-client` et `@stomp/stompjs` (ou `stompjs`) sont
 * présents dans les assets.
 *
 * Différences avec le legacy :
 *  - `$q.defer().notify()` (pattern AngularJS) → `Subject<T>` RxJS
 *  - `$timeout` → `setTimeout` natif
 *  - `receive()` retourne un Observable au lieu d'une Promise avec notifications
 *  - Cleanup via `ngOnDestroy()` au lieu de `$scope.$on('$destroy')`
 */
@Injectable({ providedIn: 'root' })
export class WebsockListenerService implements OnDestroy {

  private readonly RECONNECT_TIMEOUT = 30_000;
  private readonly SOCKET_URL        = 'http://127.0.0.1:8787/certificat';
  private readonly SIG_TOPIC         = '/topic/getCertificat';
  private readonly SIG_BROKER        = '/sigApp/certificat';

  private readonly _messages$ = new Subject<unknown>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private socket: { client: any; stomp: any } = { client: null, stomp: null };
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this._initialize();
  }

  /** Flux de messages reçus depuis le topic STOMP. Miroir de `receive()`. */
  receive(): Observable<unknown> {
    return this._messages$.asObservable();
  }

  /** Envoie un message via STOMP. Miroir de `send(message)`. */
  send(message: unknown): void {
    if (this.socket.stomp?.connected) {
      this.socket.stomp.send(
        this.SIG_BROKER,
        {},
        JSON.stringify(message)
      );
    }
  }

  ngOnDestroy(): void {
    this._messages$.complete();
    clearTimeout(this.reconnectTimer);
    this.socket.stomp?.disconnect();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _initialize(): void {
    // SockJS et Stomp sont des globaux chargés via scripts (index.html / angular.json)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (!win.SockJS || !win.Stomp) {
      console.warn('[WebsockListenerService] SockJS / Stomp non disponibles.');
      return;
    }

    this.socket.client = new win.SockJS(this.SOCKET_URL);
    this.socket.stomp  = win.Stomp.over(this.socket.client);

    this.socket.stomp.connect({}, () => this._startListener());
    this.socket.stomp.onclose = () => this._reconnect();
  }

  private _startListener(): void {
    this.socket.stomp.subscribe(this.SIG_TOPIC, (frame: { body: string }) => {
      try {
        const message = JSON.parse(frame.body);
        this._messages$.next(message);
      } catch {
        console.error('[WebsockListenerService] Erreur parse message STOMP');
      }
    });
  }

  private _reconnect(): void {
    this.reconnectTimer = setTimeout(
      () => this._initialize(),
      this.RECONNECT_TIMEOUT
    );
  }
}

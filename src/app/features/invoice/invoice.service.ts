import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

/** Critères de recherche factures (ConsultInvoice + EDoc). */
export interface EfactCriteria {
  login?:          string;
  documentNumber?: string;
  documentType?:   string;
  dateProcess?:    string;
  dateProcessTo?:  string;
  dateDocument?:   string;
  dateDocumentTo?: string;
  amountTtcFrom?:  string;
  amountTtcTo?:    string;
  amountTax?:      string;
  amountTaxTo?:    string;
  generatedRef?:   string;
  processStatus?:  string;
  typeUser?:       string;
  partnerCode?:    string;
  receiverCode?:   string;
}

/** Représentation légère d'une facture dans la liste de résultats. */
export interface EDocDto {
  id:             number;
  generatedRef:   string;
  documentNumber: string;
  documentType:   string;
  dateDocument:   string;
  dateProcess:    string;
  receiverCode:   string;
  amountTtc:      number;
  amountTax:      number;
  processStatus:  'E' | 'X' | 'R';
  partnerCode?:   string;
  toSend?:        boolean;
}

export interface Country  { id: number; libPayFr: string; libPayAr: string; }
export interface Devise   { id: number; libDevFr: string; libDevAr: string; }
export interface XsdVersion { id: string; label: string; }

export interface SendPayload {
  documentId:   number;
  generatedRef: string;
}

/**
 * InvoiceService
 *
 * Migré depuis `InvoiceService` factory (invoice-service.js).
 *
 * Tous les `$resource` et `$http` → `HttpClient` Angular.
 * `.success()` (API Angular 1.x supprimée en AngularJS 1.6) → `.subscribe()` / `pipe(map)`.
 * IE/Edge msSaveOrOpenBlob → supprimé (non supporté Angular 19).
 *
 * Les méthodes conservent les mêmes signatures fonctionnelles que le legacy.
 */
@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);

  /** POST api/consultInvoice — liste de factures de l'utilisateur. */
  fetchEDocs(criteria: EfactCriteria): Observable<EDocDto[]> {
    return this.http.post<EDocDto[]>('api/consultInvoice', criteria);
  }

  /** GET api/getTeif/:login/:documentId — XML TEIF brut. */
  getTeif(login: string, documentId: number): Observable<string> {
    return this.http.get(`api/getTeif/${login}/${documentId}`, { responseType: 'text' });
  }

  /** GET api/getErrors/:documentId — liste des erreurs de traitement. */
  getErrors(documentId: number): Observable<string[]> {
    return this.http.get<string[]>(`api/getErrors/${documentId}`);
  }

  /**
   * POST api/generateTeif — envoie le XML TEIF signé au serveur.
   * Content-Type: application/xml.
   */
  generateTeif(xml: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>('api/generateTeif', xml, {
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  /**
   * POST api/validateTeif — valide le XML TEIF avant signature.
   * Paramètres : versionNumber et signedInvoice (booléen).
   */
  validateTeif(
    xml: string,
    signedInvoice: boolean,
    versionNumber: string
  ): Observable<unknown> {
    return this.http.post('api/validateTeif', xml, {
      headers: { 'Content-Type': 'application/xml' },
      params: new HttpParams()
        .set('versionNumber', versionNumber)
        .set('signedInvoice', String(signedInvoice)),
    });
  }

  /** GET api/exportInvoiceToPdf/:documentId — PDF en arraybuffer. */
  fillReport(documentId: number): Observable<ArrayBuffer> {
    return this.http.get(`api/exportInvoiceToPdf/${documentId}`, {
      responseType: 'arraybuffer',
    });
  }

  /**
   * POST api/visualiseInvoice/:documentIdentif — aperçu PDF d'un XML local.
   * Content-Type: application/xml, réponse arraybuffer.
   */
  visualiseReport(documentIdentif: string, xml: string): Observable<ArrayBuffer> {
    return this.http.post(`api/visualiseInvoice/${documentIdentif}`, xml, {
      headers: { 'Content-Type': 'application/xml' },
      responseType: 'arraybuffer',
    });
  }

  /** GET api/ref/countries — liste des pays. */
  getCountryList(): Observable<Country[]> {
    return this.http.get<Country[]>('api/ref/countries');
  }

  /** GET api/ref/devises — liste des devises. */
  getDeviseList(): Observable<Devise[]> {
    return this.http.get<Devise[]>('api/ref/devises');
  }

  /** GET api/ref/schema-versions — versions XSD disponibles. */
  getXsdVersionList(): Observable<XsdVersion[]> {
    return this.http.get<XsdVersion[]>('api/ref/schema-versions');
  }

  /** GET api/_search/fatoora/:matFisc/:generatedRef — consultation publique d'une facture. */
  getFatoora(generatedRef: string, matFisc: string): Observable<string> {
    return this.http.get(`api/_search/fatoora/${matFisc}/${generatedRef}`, {
      responseType: 'text',
    });
  }

  /** POST api/send-fatooras — envoie une ou plusieurs factures à un receveur. */
  sendFatooras(receiver: string, fatooras: SendPayload[]): Observable<string> {
    return this.http.post('api/send-fatooras', fatooras, {
      params: new HttpParams().set('receiver', receiver),
      responseType: 'text',
    });
  }

  // ── Utilitaires PDF (anciennement openPDF dans les controllers) ────────────

  /** Ouvre/télécharge un PDF à partir d'un ArrayBuffer. */
  openPdf(data: ArrayBuffer, fileName: string): void {
    this._saveBlob(new Blob([data], { type: 'application/pdf' }), fileName);
  }

  /** Télécharge un fichier XML. */
  downloadXml(xmlContent: string, fileName: string): void {
    this._saveBlob(
      new Blob([xmlContent], { type: 'text/plain;charset=utf-8' }),
      fileName
    );
  }

  private _saveBlob(blob: Blob, fileName: string): void {
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// WebsockService (invoice/websock-service.js)
//
// Identique à WebsockListenerService (core/) mais pointe sur
// l'endpoint /sign (résultat de signature) au lieu de /certificat.
// Les deux partagent la même architecture SockJS/STOMP.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * InvoiceWebsockService
 *
 * Migré depuis `WebsockService` factory (websock-service.js).
 *
 * Reçoit les résultats de signature via STOMP over SockJS :
 * - SOCKET_URL  : http://127.0.0.1:8787/sign
 * - SIG_TOPIC   : /topic/showResult
 * - SIG_BROKER  : /sigApp/sign
 *
 * `$q.defer().notify()` → `Subject<T>` RxJS (même changement que WebsockListenerService).
 */
@Injectable({ providedIn: 'root' })
export class InvoiceWebsockService implements OnDestroy {
  private readonly RECONNECT_TIMEOUT = 30_000;
  private readonly SOCKET_URL        = 'http://127.0.0.1:8787/sign';
  private readonly SIG_TOPIC         = '/topic/showResult';
  private readonly SIG_BROKER        = '/sigApp/sign';

  private readonly _messages$ = new Subject<unknown>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private socket: { client: any; stomp: any } = { client: null, stomp: null };
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this._initialize();
  }

  receive(): Observable<unknown> {
    return this._messages$.asObservable();
  }

  send(message: unknown): void {
    if (this.socket.stomp?.connected) {
      this.socket.stomp.send(this.SIG_BROKER, {}, JSON.stringify(message));
    }
  }

  ngOnDestroy(): void {
    this._messages$.complete();
    clearTimeout(this.reconnectTimer);
    this.socket.stomp?.disconnect();
  }

  private _initialize(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (!win.SockJS || !win.Stomp) {
      console.warn('[InvoiceWebsockService] SockJS / Stomp non disponibles.');
      return;
    }
    this.socket.client = new win.SockJS(this.SOCKET_URL);
    this.socket.stomp  = win.Stomp.over(this.socket.client);
    this.socket.stomp.connect({}, () => this._startListener());
    this.socket.stomp.onclose = () => this._reconnect();
  }

  private _startListener(): void {
    this.socket.stomp.subscribe(
      this.SIG_TOPIC,
      (frame: { body: string }) => {
        try { this._messages$.next(JSON.parse(frame.body)); }
        catch { console.error('[InvoiceWebsockService] Parse error'); }
      },
      (error: unknown) => console.error('[InvoiceWebsockService] Subscribe error', error)
    );
  }

  private _reconnect(): void {
    console.log('[InvoiceWebsockService] reconnect...');
    this.reconnectTimer = setTimeout(() => this._initialize(), this.RECONNECT_TIMEOUT);
  }
}

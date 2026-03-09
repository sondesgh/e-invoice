  /**
 * environment.ts  (développement)
 *
 * Valeurs à externaliser depuis le legacy :
 *
 * 1. apiUrl          → backend Spring Boot (proxy Angular CLI en dev, URL directe en prod)
 * 2. wsUrl           → WebSocket /websocket/tracker (depuis websock-service.js)
 * 3. captchaEnabled  → vcRecaptcha dans app.module.js
 * 4. captchaSiteKey  → clé publique Google reCAPTCHA v2
 *                      (depuis angular-recaptcha / RecaptchaService)
 * 5. debugInfoEnabled → DEBUG_INFO_ENABLED depuis app.constants.js (Gulp ngconstant)
 * 6. version         → VERSION depuis app.constants.js (Gulp ngconstant)
 */
export const environment = {
  production:        false,
  // URL du backend Spring Boot
  // En dev : Angular CLI proxy (proxy.conf.json) → laisser '' pour utiliser le proxy
  // En prod : URL complète ex. 'https://api.portail-elfatoora.tn'
  apiUrl: 'http://localhost:8080',
  // WebSocket Spring (depuis websock-service.js : SockJS('/websocket/tracker'))
  wsUrl: '/websocket/tracker',

  // reCAPTCHA — vcRecaptcha dans app.module.js / RecaptchaService
  captchaEnabled:  true,
  captchaSiteKey:  'TODO_RECAPTCHA_SITE_KEY',   // ← remplacer par la vraie clé

  // Depuis Gulp ngconstant → app.constants.js
  debugInfoEnabled: true,
  version:          '0.0.1-SNAPSHOT',
};

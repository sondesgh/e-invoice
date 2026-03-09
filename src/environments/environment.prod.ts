export const environment = {
  production: true,
   // URL complète du backend en production
  apiUrl: 'https://api.portail-elfatoora.tn',   // ← remplacer
  // WebSocket (même chemin relatif — le reverse proxy gère)
  wsUrl: '/websocket/tracker',
  captchaEnabled: true,
  captchaSiteKey: 'TODO_SITEKEY_PROD',  // ← remplacer
  debugInfoEnabled:  false,
  version:           '1.0.0',
};
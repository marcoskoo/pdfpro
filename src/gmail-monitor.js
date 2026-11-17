/* PDFPro — gmail-monitor.js (v3.0.0)
 * Módulo del proceso principal: monitoreo del correo Gmail
 * sphiaisaro@gmail.com para capturar la HORA DE RECEPCIÓN de los correos
 * con archivos adjuntos (FPL / licencias) y asociarlos a los documentos
 * cargados en la app.
 * Flujo OAuth 2.0 de Google con las credenciales del cliente provistas:
 *   - Ventana nativa de consentimiento (reutiliza oauth:open del main)
 *   - Intercambio del código por tokens en el endpoint de Google
 *   - Tokens guardados en <userData>/gmail-tokens.json (se refrescan solos)
 *   - Sondeo cada N minutos de gmail.users.messages.list con has:attachment
 * La API de Gmail se consulta con fetch (sin dependencias extra).
 */
'use strict';

const fs = require('fs');
const path = require('path');

/* ── Credenciales OAuth del cliente Gmail ──
   Se toman de variables de entorno (GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET /
   GMAIL_ACCOUNT / GMAIL_REDIRECT_URI) y, si no están definidas, de un archivo
   gmail-credentials.json junto a este módulo (formato: {"clientId": "...",
   "clientSecret": "...", "account": "...", "redirectUri": "..."}), que NO se
   sube al repositorio (.gitignore). Así el repo no contiene secretos. */
function loadCreds() {
  const fallbackPath = path.join(__dirname, 'gmail-credentials.json');
  let fileCreds = {};
  try { fileCreds = JSON.parse(fs.readFileSync(fallbackPath, 'utf8')); } catch (e) { /* opcional */ }
  return {
    clientId: process.env.GMAIL_CLIENT_ID || fileCreds.clientId || '',
    clientSecret: process.env.GMAIL_CLIENT_SECRET || fileCreds.clientSecret || '',
    account: process.env.GMAIL_ACCOUNT || fileCreds.account || '',
    redirectUri: process.env.GMAIL_REDIRECT_URI || fileCreds.redirectUri || ''
  };
}
const CREDS = loadCreds();
const CLIENT_ID = CREDS.clientId;
const CLIENT_SECRET = CREDS.clientSecret;
const ACCOUNT = CREDS.account;
const SCOPES = 'https://mail.google.com/';
const REDIRECT_URI = CREDS.redirectUri;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('[gmail-monitor] Faltan credenciales OAuth: define GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET o crea src/gmail-credentials.json (ver gmail-credentials.example.json).');
}

function tokensPath(userData) {
  return path.join(userData, 'gmail-tokens.json');
}

function loadTokens(userData) {
  try {
    return JSON.parse(fs.readFileSync(tokensPath(userData), 'utf8'));
  } catch (e) {
    return null;
  }
}

function saveTokens(userData, t) {
  try {
    fs.writeFileSync(tokensPath(userData), JSON.stringify(t, null, 2));
  } catch (e) { /* sin permisos: queda solo en memoria */ }
}

/** URL de consentimiento de Google. */
function consentUrl(state) {
  return 'https://accounts.google.com/o/oauth2/v2/auth?' +
    'client_id=' + encodeURIComponent(CLIENT_ID) +
    '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
    '&response_type=code' +
    '&scope=' + encodeURIComponent(SCOPES) +
    '&access_type=offline' +
    '&prompt=consent' +
    '&login_hint=' + encodeURIComponent(ACCOUNT) +
    '&state=' + encodeURIComponent(state || '');
}

/** Intercambia el código de autorización por tokens (access + refresh). */
async function exchangeCode(code) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: String(code || '').trim(),
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data;
}

/** Refresca el access token con el refresh token guardado. */
async function refreshToken(refresh) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refresh,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token'
    })
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data;
}

/** Devuelve un access token válido (refresca si está por expirar). */
async function getAccessToken(userData) {
  const t = loadTokens(userData);
  if (!t || !t.access_token) throw new Error('Gmail no conectado');
  const expires = parseInt(t.expires_at || '0', 10);
  if (expires && Date.now() < expires - 120000) return t.access_token;
  if (!t.refresh_token) throw new Error('Sesión de Gmail expirada: reconecta el correo');
  const fresh = await refreshToken(t.refresh_token);
  t.access_token = fresh.access_token;
  t.expires_at = String(Date.now() + (parseInt(fresh.expires_in || '3600', 10) - 60) * 1000);
  saveTokens(userData, t);
  return t.access_token;
}

/* ── Consultas a la API de Gmail ── */

async function gmailFetch(userData, url) {
  const token = await getAccessToken(userData);
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 401) {
    // token inválido a pesar del refresh → forzar un refresh y reintentar una vez
    const t = loadTokens(userData);
    if (t && t.refresh_token) {
      const fresh = await refreshToken(t.refresh_token);
      t.access_token = fresh.access_token;
      t.expires_at = String(Date.now() + (parseInt(fresh.expires_in || '3600', 10) - 60) * 1000);
      saveTokens(userData, t);
      const r2 = await fetch(url, { headers: { Authorization: 'Bearer ' + t.access_token } });
      if (!r2.ok) throw new Error('Gmail API ' + r2.status + ': ' + (await r2.text()).slice(0, 200));
      return r2.json();
    }
    throw new Error('Sesión de Gmail expirada: reconecta el correo');
  }
  if (!r.ok) throw new Error('Gmail API ' + r.status + ': ' + (await r2SafeText(r)).slice(0, 200));
  return r.json();
}

async function r2SafeText(r) {
  try { return await r.text(); } catch (e) { return ''; }
}

/** Lista los mensajes con adjunto (más recientes primero). */
async function listMessages(userData, query, maxResults) {
  const q = encodeURIComponent(query || 'has:attachment newer_than:7d');
  const n = maxResults || 25;
  return gmailFetch(userData,
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=' + n + '&q=' + q);
}

/** Detalle de un mensaje: hora de recepción (internalDate), remitente, asunto
 *  y nombres de los archivos adjuntos. */
async function messageDetail(userData, id) {
  const m = await gmailFetch(userData,
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/' + id + '?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date');
  const headers = (m.payload && m.payload.headers) || [];
  const h = (k) => { const x = headers.find((q) => q.name.toLowerCase() === k.toLowerCase()); return x ? x.value : ''; };
  const adjuntos = [];
  (function walk(part) {
    if (!part) return;
    if (part.filename) adjuntos.push(part.filename);
    (part.parts || []).forEach(walk);
  })(m.payload);
  const recibidoMs = parseInt(m.internalDate || (m.threadId ? '0' : '0'), 10);
  return {
    id: m.id,
    threadId: m.threadId || '',
    de: h('From'),
    asunto: h('Subject'),
    fechaHeader: h('Date'),
    recibidoMs: recibidoMs || 0,
    recibidoISO: recibidoMs ? new Date(recibidoMs).toISOString() : '',
    adjuntos: adjuntos
  };
}

/** Barrido completo: lista + detalle de cada mensaje con adjunto. */
async function poll(userData, query, maxResults) {
  const list = await listMessages(userData, query, maxResults);
  const msgs = (list && list.messages) || [];
  const out = [];
  for (const m of msgs) {
    try { out.push(await messageDetail(userData, m.id)); }
    catch (e) { /* un mensaje fallido no corta el barrido */ }
  }
  out.sort((a, b) => (b.recibidoMs || 0) - (a.recibidoMs || 0));
  return out;
}

/** Perfil de la cuenta conectada (valida que sea sphiaisaro@gmail.com). */
async function profile(userData) {
  return gmailFetch(userData, 'https://gmail.googleapis.com/gmail/v1/users/me/profile');
}

module.exports = {
  ACCOUNT, CLIENT_ID, REDIRECT_URI, SCOPES,
  consentUrl, exchangeCode, loadTokens, saveTokens,
  getAccessToken, listMessages, messageDetail, poll, profile
};

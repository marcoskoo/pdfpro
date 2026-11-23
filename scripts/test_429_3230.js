/* Test unitario v3.2.30 — reintento de 429 en src/gmail-monitor.js
   (gmailFetch): un 429 espera 1,5 s y reintenta UNA vez; si persiste,
   falla con el error claro. Ejecutar: node scripts/test_429_3230.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

// tokens válidos (access_token vigente → sin refresh) en un userData temporal
const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'gm429-'));
fs.writeFileSync(path.join(ud, 'gmail-tokens.json'), JSON.stringify({
  access_token: 'tok-test', expires_at: String(Date.now() + 3600 * 1000), refresh_token: 'r'
}));

const gmail = require('/home/z/my-project/src/gmail-monitor.js');
const realFetch = global.fetch;
let calls = [];
let plan = [];   // cada elemento: {status, body}

global.fetch = async (url) => {
  calls.push(String(url));
  const step = plan[Math.min(calls.length - 1, plan.length - 1)];
  return {
    ok: step.status >= 200 && step.status < 300,
    status: step.status,
    json: async () => step.body,
    text: async () => JSON.stringify(step.body)
  };
};

(async () => {
  let fallos = 0;

  // 1) 429 → espera 1,5 s → reintento OK: el barrido NO falla
  calls = []; plan = [
    { status: 429, body: { error: 'rateLimitExceeded' } },
    { status: 200, body: { messages: [] } }
  ];
  const t0 = Date.now();
  const r1 = await gmail.poll(ud, 'has:attachment', 5);
  const dt = Date.now() - t0;
  console.log((calls.length === 2 && dt >= 1400 && Array.isArray(r1)) ? '  OK  · 429→reintento→éxito (2 fetch, ' + dt + ' ms)' : '  FALLA · calls=' + calls.length + ' dt=' + dt);
  if (!(calls.length === 2 && dt >= 1400)) fallos++;

  // 2) 429 persistente: falla tras EL reintento (no martilla la cuota)
  calls = []; plan = [{ status: 429, body: { error: 'rateLimitExceeded' } }];
  let msg = '';
  try { await gmail.poll(ud, 'has:attachment', 5); msg = 'sin error'; }
  catch (e) { msg = e.message; }
  console.log((calls.length === 2 && /429/.test(msg)) ? '  OK  · 429 persistente → error claro tras 1 reintento («' + msg + '»)' : '  FALLA · calls=' + calls.length + ' msg=' + msg);
  if (!(calls.length === 2 && /429/.test(msg))) fallos++;

  // 3) pollOrdenado: el detalle de un mensaje también reintenta tras 429
  calls = []; plan = [
    { status: 200, body: { messages: [{ id: 'm1' }] } },                       // lista
    { status: 429, body: { error: 'rateLimitExceeded' } },                     // detalle → 429
    { status: 200, body: { internalDate: '1774000000000', payload: { headers: [], parts: [{ filename: 'fpl_x.pdf' }] } } }  // reintento
  ];
  const m = await gmail.pollOrdenado(ud, 'fpl_x.pdf', 5);
  console.log((m && m.recibidoMs === 1774000000000 && (m.adjuntos || [])[0] === 'fpl_x.pdf') ? '  OK  · pollOrdenado sobrevive un 429 en el detalle' : '  FALLA · ' + JSON.stringify(m));
  if (!(m && m.recibidoMs === 1774000000000)) fallos++;

  global.fetch = realFetch;
  fs.rmSync(ud, { recursive: true, force: true });
  console.log(fallos ? '✗ ' + fallos + ' fallo(s)' : '✓ 429-RETRY OK (3/3)');
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error('ERROR DEL TEST:', e); process.exit(2); });

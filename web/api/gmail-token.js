/* PDFPro Suite — api/gmail-token (Vercel Serverless Function)
 * Proxy del intercambio OAuth de Gmail: el navegador NO puede llamar
 * directamente a https://oauth2.googleapis.com/token (CORS), así que esta
 * función hace el intercambio (code→tokens) y el refresco (refresh_token).
 * Solo responde a POST con JSON { code, redirect_uri } o { refresh_token }.
 * Credenciales del cliente Gmail provistas por el usuario (PDFPro). */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  /* Credenciales desde variables de entorno de Vercel (Settings → Environment
   * Variables): GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET. Nunca en el código. */
  const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
  const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.status(500).json({ error: 'missing_credentials', error_description: 'Configura GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET en las variables de entorno de Vercel' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    let params;
    if (body.refresh_token) {
      params = new URLSearchParams({
        refresh_token: String(body.refresh_token),
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token'
      });
    } else if (body.code) {
      params = new URLSearchParams({
        code: String(body.code),
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: String(body.redirect_uri || 'https://licencias-firmas.vercel.app/oauth/gmail-callback'),
        grant_type: 'authorization_code'
      });
    } else {
      res.status(400).json({ error: 'invalid_request', error_description: 'falta code o refresh_token' });
      return;
    }

    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const data = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: data.error || 'oauth_error', error_description: data.error_description || '' });
      return;
    }
    res.status(200).json({
      access_token: data.access_token,
      refresh_token: data.refresh_token || null,
      expires_in: data.expires_in,
      scope: data.scope || null,
      token_type: data.token_type || 'Bearer'
    });
  } catch (e) {
    res.status(500).json({ error: 'proxy_error', error_description: String(e && e.message ? e.message : e) });
  }
}

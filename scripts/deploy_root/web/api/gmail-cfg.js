/* PDFPro Suite — api/gmail-cfg (Vercel Serverless Function)
 * Devuelve el clientId público de Gmail (variable de entorno GMAIL_CLIENT_ID).
 * El clientId NO es secreto (se usa en el navegador), pero así no queda
 * hardcodeado en el repositorio. */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const clientId = process.env.GMAIL_CLIENT_ID || '';
  if (!clientId) {
    res.status(500).json({ error: 'missing_credentials', message: 'Configura GMAIL_CLIENT_ID en las variables de entorno de Vercel' });
    return;
  }
  res.status(200).json({ clientId });
}

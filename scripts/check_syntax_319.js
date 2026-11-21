#!/usr/bin/env node
/* Verifica la sintaxis JS de todos los bloques <script> inline de web/index.html */
const fs = require('fs');
const h = fs.readFileSync(process.argv[2] || 'web/index.html', 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, i = 0, err = 0;
while ((m = re.exec(h))) {
  i++;
  const code = m[1];
  if (!code.trim()) continue;
  try { new Function(code); }
  catch (e) { err++; console.log(`✗ bloque #${i}: ${e.message}`); }
}
console.log(err ? `✗ ${err} bloque(s) con error de sintaxis (de ${i})` : `✓ ${i} bloque(s) inline, sintaxis OK`);
process.exit(err ? 1 : 0);

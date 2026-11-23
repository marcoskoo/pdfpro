/* Test v3.2.39 — EL SELLO DE TURNO SIGUE A LAS INICIALES DEL OPERADOR.
   Reporte real (ficha SKX5303): sesión logueada de Marcos Koo (MK) con su
   sello «Koo_sello» activo, operador de turno Francessca Chumpitaz (FC) —
   el sello de recepción se colocaba con la FIRMA DE OTRO. Se extraen las
   funciones REALES de web/index.html y se ejercitan con una librería de
   sellos simulada. */
'use strict';
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('/home/z/my-project/web/index.html', 'utf8');
let fallos = 0;

function chk(desc, obtenido, esperado) {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log((ok ? '  OK  ' : 'FALLA ') + '· ' + desc + ' → ' + JSON.stringify(obtenido) +
    (ok ? '' : ' (esperaba ' + JSON.stringify(esperado) + ')'));
}
/* extrae «function nombre(…) {…}» contando llaves (los {n} de las regex y
   los mapas de acentos traen llaves BALANCEADAS, así que el conteo basta) */
function extrae(nombre) {
  const i = html.indexOf('function ' + nombre + '(');
  if (i < 0) throw new Error('no encontré ' + nombre);
  let d = 0, inicio = -1;
  for (let k = i; k < html.length; k++) {
    if (html[k] === '{') { if (d === 0) inicio = k; d++; }
    else if (html[k] === '}') { d--; if (d === 0) return html.slice(i, k + 1); }
  }
  throw new Error('no cerré ' + nombre);
}

/* ── sandbox: DOM mínimo + librería de sellos simulada ── */
const campo = { value: '' };
const toasts = [];
const remote = [];
let confirmar = true;
const sb = {
  console,
  document: { getElementById: (id) => (id === 'selloTxInitials' ? campo : null) },
  currentUser: { name: 'Koo Paz Marcos Roberto' },
  sigLibrary: [
    { id: 'k1', src: 'k.png', name: 'Koo_sello' },
    { id: 'f1', src: 'f.png', name: 'Francessca_Chumpitaz_sello' },
    { id: 't1', src: 't.png', name: 'Torres_sello' }
  ],
  activeSigId: 'k1',
  toast: (m) => toasts.push(m),
  renderSigLib: () => {},
  updateSelloPreview: () => {},
  setActiveSigIdRemote: async (id) => { remote.push(id); },
  confirm: () => confirmar
};
vm.createContext(sb);
vm.runInContext([
  extrae('inicialesDeNombre'), extrae('normIni'), extrae('inicialesDeNombreSmart'),
  extrae('getActiveSig'), extrae('sigIni'), extrae('oprIniActual'),
  extrae('syncSelloDeTurno'), extrae('selloTurnoDistinto'), extrae('confirmarSelloTurno')
].join('\n'), sb);

/* 1) sigIni — iniciales del dueño a partir del NOMBRE del sello */
chk('«Koo_sello» + sesión «Koo Paz Marcos Roberto» → MK', sb.sigIni(sb.sigLibrary[0]), 'MK');
chk('«FC_sello» (2 letras) → FC', sb.sigIni({ id: 'x', name: 'FC_sello' }), 'FC');
chk('«Francessca_Chumpitaz_sello» → FC', sb.sigIni(sb.sigLibrary[1]), 'FC');
chk('«Chumpitaz Court Frannessca Michelle» (nombre completo) → FC', sb.sigIni({ id: 'x', name: 'Chumpitaz Court Francessca Michelle' }), 'FC');
chk('«Torres_sello» (desconocido, no es de la sesión) → null', sb.sigIni(sb.sigLibrary[2]), null);
chk('«Sello CORPAC» (solo ruido) → null', sb.sigIni({ id: 'x', name: 'Sello CORPAC' }), null);

/* 2) syncSelloDeTurno — escribir FC activa el sello de Francessca */
campo.value = 'FC'; remote.length = 0; toasts.length = 0; sb.activeSigId = 'k1';
chk('teclear FC → cambia el sello de turno al de FC', sb.syncSelloDeTurno(), true);
chk('→ sello activo ahora es «Francessca_Chumpitaz_sello»', sb.activeSigId, 'f1');
chk('→ persistido remotamente', remote, ['f1']);
chk('→ aviso explica el cambio', toasts.length && toasts[0].includes('Francessca') && toasts[0].includes('FC'), true);

/* 3) sin sello que corresponda: NO toca nada */
campo.value = 'ZZ'; remote.length = 0; sb.activeSigId = 'k1';
chk('teclear ZZ (nadie) → sin cambio', sb.syncSelloDeTurno(), false);
chk('→ sello activo intacto, nada persistido', { id: sb.activeSigId, remoto: remote }, { id: 'k1', remoto: [] });

/* 4) ya coincide: no re-activa ni persiste de más */
campo.value = 'MK'; remote.length = 0; sb.activeSigId = 'k1';
chk('teclear MK (ya activo «Koo_sello») → todo igual', sb.syncSelloDeTurno(), true);
chk('→ sin re-persistir', remote, []);

/* 5) selloTurnoDistinto — el conflicto del reporte */
campo.value = 'FC'; sb.activeSigId = 'k1';
const c1 = sb.selloTurnoDistinto();
chk('conflicto: operador FC vs sello de MK', c1 && { ini: c1.ini, actIni: c1.actIni }, { ini: 'FC', actIni: 'MK' });
campo.value = 'MK';
chk('sin conflicto: operador MK y sello de MK', sb.selloTurnoDistinto(), null);
campo.value = 'FC'; sb.activeSigId = null;
const c0 = sb.selloTurnoDistinto();
chk('sin activeSigId → cae al 1.er sello de la lista y AVISA igual', c0 && { ini: c0.ini, actIni: c0.actIni }, { ini: 'FC', actIni: 'MK' });
sb.activeSigId = 't1';
chk('sello de dueño desconocido («Torres_sello») → sin conflicto comprobable', sb.selloTurnoDistinto(), null);

/* 6) confirmarSelloTurno — la barrera antes de sellar con otra firma */
campo.value = 'FC'; sb.activeSigId = 'k1';
confirmar = false;
chk('operador FC + sello de MK + usuario RECHAZA → NO sellar', sb.confirmarSelloTurno(), false);
confirmar = true;
chk('operador FC + sello de MK + usuario ACEPTA → sellar', sb.confirmarSelloTurno(), true);
campo.value = 'MK';
confirmar = false;
chk('sin conflicto → sellar sin preguntar', sb.confirmarSelloTurno(), true);

console.log(fallos ? '✗ ' + fallos + ' fallo(s)' : '✓ SELLO-DE-TURNO OK (17/17)');
process.exit(fallos ? 1 : 0);

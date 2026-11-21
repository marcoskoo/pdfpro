/* PDFPro Suite — v3.1.0 — Verificación de licencias del personal aeronáutico (DGAC/SIVLAM)
 * Motor con «ventana asistida»: el captcha de BotDetect de SIVLAM no es resoluble
 * de forma fiable por OCR, así que la app abre la página de la DGAC en una ventana
 * nativa; el usuario completa el registro/captcha UNA sola vez (o la sesión ya
 * queda iniciada) y desde ahí el motor automatiza todo: seleccionar búsqueda por
 * licencia, elegir la categoría, escribir el número, pulsar Buscar, abrir el
 * detalle y extraer los datos (nombre, licencia, habilitaciones, lingüística,
 * apto médico, estado, foto).
 *
 * Basado en el verificador «Licencias Pilotos.py» del usuario (mismos selectores
 * y misma semántica de campos), adaptado a Electron sin Playwright. */

const SIVLAM_BASE = 'https://sivlam.mtc.gob.pe';

const LICENCIAS_LABELS = {
  'PILOTO COMERCIAL AVION': 'PILOTO COMERCIAL AVIÓN',
  'ALUMNO PILOTO': 'ALUMNO PILOTO',
  'PILOTO PRIVADO AVION': 'PILOTO PRIVADO AVIÓN',
  'INSTRUCTOR DE VUELO AVION': 'INSTRUCTOR DE VUELO AVIÓN',
  'PILOTO COMERCIAL HELICOPTERO': 'PILOTO COMERCIAL HELICÓPTERO',
  'PILOTO TRANSPORTE DE LINEA AEREA AVION': 'PILOTO TRANSPORTE DE LÍNEA AÉREA AVIÓN',
  'PILOTO TRANSPORTE LINEA AEREA HELICOPTERO': 'PILOTO TRANSPORTE LÍNEA AÉREA HELICÓPTERO'
};

const LIC_ABBREV = {
  PC: 'PILOTO COMERCIAL AVION', 'PILOTO COMERCIAL AVION': 'PILOTO COMERCIAL AVION',
  AP: 'ALUMNO PILOTO', 'ALUMNO PILOTO': 'ALUMNO PILOTO',
  PP: 'PILOTO PRIVADO AVION', 'PILOTO PRIVADO AVION': 'PILOTO PRIVADO AVION',
  IV: 'INSTRUCTOR DE VUELO AVION', IDV: 'INSTRUCTOR DE VUELO AVION',
  PI: 'INSTRUCTOR DE VUELO AVION', 'INSTRUCTOR DE VUELO AVION': 'INSTRUCTOR DE VUELO AVION',
  PCH: 'PILOTO COMERCIAL HELICOPTERO', PH: 'PILOTO COMERCIAL HELICOPTERO',
  'PILOTO COMERCIAL HELICOPTERO': 'PILOTO COMERCIAL HELICOPTERO',
  TLA: 'PILOTO TRANSPORTE DE LINEA AEREA AVION',
  'PILOTO TRANSPORTE DE LINEA AEREA AVION': 'PILOTO TRANSPORTE DE LINEA AEREA AVION',
  TLH: 'PILOTO TRANSPORTE LINEA AEREA HELICOPTERO',
  'PILOTO TRANSPORTE LINEA AEREA HELICOPTERO': 'PILOTO TRANSPORTE LINEA AEREA HELICOPTERO'
};

function normAcc(s) {
  return String(s || '').toUpperCase()
    .replace(/Í/g, 'I').replace(/É/g, 'E').replace(/Ó/g, 'O').replace(/Ú/g, 'U').replace(/Á/g, 'A').replace(/Ñ/g, 'N')
    .replace(/á/g, 'A').replace(/é/g, 'E').replace(/í/g, 'I').replace(/ó/g, 'O').replace(/ú/g, 'U');
}

function parseFecha(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
  if (!m) return null;
  let y = parseInt(m[3], 10); if (y < 100) y += 2000;
  return new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

/** Clasifica el estado final: vigente | suspendida | no_vigente (misma lógica del .py). */
function estadoFinal(datos) {
  const est = String(datos.estado_licencia || '').toLowerCase();
  const negs = ['no ha sido susp', 'no esta susp', 'no está susp', 'no ha sido revoc',
    'no esta revoc', 'no está revoc', 'ni suspen', 'ni revoc', 'sin suspen', 'sin revoc'];
  const suspendidaPorEstado = negs.some(n => est.includes(n)) ? false : (est.includes('susp') || est.includes('revoc'));
  if (suspendidaPorEstado) return { estado: 'suspendida', motivo: 'estado_licencia' };
  const aptos = datos.apto_medico || [];
  if (aptos.some(m => String(m.estado || '').toLowerCase().includes('venc'))) {
    return { estado: 'suspendida', motivo: 'apto_vencido' };
  }
  if (aptos.some(m => String(m.estado || '').toLowerCase().includes('vigente'))) {
    return { estado: 'vigente', motivo: null };
  }
  return { estado: 'no_vigente', motivo: null };
}

/** JS que se inyecta en la ventana SIVLAM: extrae el detalle de la licencia
 *  del DOM (mismos selectores que el verificador original). */
const EXTRACT_JS = `(() => {
  const out = { nombre:'', nacionalidad:'', tipo_licencia:'', num_licencia:'',
    fecha_expedicion:'', restriccion:'', estado_licencia:'', habilitaciones:[],
    linguistica:[], apto_medico:[], foto:'' };
  const cont = document.querySelector('#contenedor') || document;
  document.querySelectorAll('#contenedor fieldset, fieldset').forEach(fs => {
    const lg = fs.querySelector('legend');
    if (!lg) return;
    const lt = lg.innerText.replace(/\\s+/g,' ').trim().toLowerCase();
    if (lt.includes('datos personales')) {
      fs.querySelectorAll('label.control-label').forEach(lbl => {
        const t = lbl.innerText.replace(/\\u00a0/g,'').replace(/\\s+/g,' ').trim().toLowerCase();
        const col = lbl.closest('div');
        if (!col) return;
        const vd = col.querySelector('.col-md-12') || col.parentElement.querySelector('.col-md-12');
        const v = vd ? vd.innerText.trim() : '';
        if (!v) return;
        if (t.includes('nombre') && t.includes('apellido')) out.nombre = v;
        else if (t.includes('nacionalidad')) out.nacionalidad = v;
        else if (t.includes('licencia') && t.includes('numero')) out.num_licencia = v;
        else if (t.includes('licencia')) out.tipo_licencia = v;
        else if (t.includes('expedic')) out.fecha_expedicion = v;
        else if (t.includes('restricci')) out.restriccion = v;
        else if (t.includes('estado')) out.estado_licencia = v;
      });
    } else if (lt.includes('habilitaciones')) {
      fs.querySelectorAll('table tbody tr').forEach(tr => {
        const c = tr.querySelectorAll('td');
        if (c.length >= 2) out.habilitaciones.push({ habilitacion: c[0].innerText.trim(), fecha_otorgamiento: c[1].innerText.trim() });
      });
    } else if (lt.includes('ling')) {
      fs.querySelectorAll('table tbody tr').forEach(tr => {
        const c = tr.querySelectorAll('td');
        if (c.length >= 5) out.linguistica.push({ evaluacion: c[0].innerText.trim(), fecha_otorgamiento: c[1].innerText.trim(), fecha_vencimiento: c[2].innerText.trim(), fecha_prorroga: c[3].innerText.trim(), estado: c[4].innerText.trim() });
      });
    } else if (lt.includes('apto') && (lt.includes('medic'))) {
      fs.querySelectorAll('table tbody tr').forEach(tr => {
        const c = tr.querySelectorAll('td');
        if (c.length >= 5) out.apto_medico.push({ clase: c[0].innerText.trim(), fecha_otorgamiento: c[1].innerText.trim(), fecha_vencimiento: c[2].innerText.trim(), fecha_prorroga: c[3].innerText.trim(), estado: c[4].innerText.trim() });
      });
    }
  });
  const f = document.querySelector('#foto_percard2');
  if (f) out.foto = f.getAttribute('src') || '';
  return out;
})()`;

/** Paso 1 (inyectado): ¿estamos en la página de Consulta con el formulario visible? */
const STATE_JS = `(() => {
  const r = {};
  r.url = location.href;
  r.enConsulta = !!(document.querySelector('#XID_TIPO_DOCUMENTO') && document.querySelector('#NRO_DOCUMENTO'));
  r.enRegistro = !!document.querySelector('#frm_Autentica');
  r.hayResultados = !!document.querySelector('#contenedor table, .table tbody tr td, span[onclick*=ViewLicencia], span[role=button]');
  r.btnBuscar = !!document.querySelector('button.btn.btn-primary');
  return r;
})()`;

/** Paso 2 (inyectado): llena el formulario de búsqueda por licencia y devuelve el estado. */
function fillFormJS(tipoLicencia, numLicencia) {
  return `(() => {
    const r = {};
    try {
      const radios = document.querySelectorAll("input[type=radio]");
      let picked = null;
      radios.forEach(rd => { if (rd.value === '2') picked = rd; });
      if (!picked && radios.length) picked = radios[1] || radios[0];
      if (picked) { picked.click(); }
      r.radio = picked ? picked.value : null;
    } catch (e) { r.radioErr = String(e); }
    try {
      const combo = document.querySelector('#XID_TIPO_DOCUMENTO');
      if (combo) {
        const target = ${JSON.stringify(normAcc(tipoLicencia))};
        let hit = null;
        Array.from(combo.options).forEach(o => {
          const t = o.innerText.toUpperCase().replace(/Í/g,'I').replace(/É/g,'E').replace(/Ó/g,'O').replace(/Ú/g,'U').replace(/Á/g,'A');
          if (t === target || t.startsWith(target)) hit = o;
        });
        if (hit) combo.value = hit.value;
        r.combo = hit ? hit.innerText.trim() : (combo.options[1] ? combo.options[1].innerText.trim() : null);
      }
    } catch (e) { r.comboErr = String(e); }
    try {
      const inp = document.querySelector('#NRO_DOCUMENTO');
      if (inp) { inp.value = ${JSON.stringify(String(numLicencia))}; inp.dispatchEvent(new Event('input', {bubbles:true})); r.num = true; }
    } catch (e) { r.numErr = String(e); }
    return r;
  })()`;
}

/** Paso 3 (inyectado): pulsa Buscar y espera resultados (devuelve spans de detalle). */
const CLICK_BUSCAR_JS = `(() => {
  const b = document.querySelector('button.btn.btn-primary');
  if (b) { b.click(); return true; }
  return false;
})()`;

/** Paso 4 (inyectado): abre el detalle (token ViewLicencia) mediante fetch al
 *  endpoint AJAX (igual que el verificador original) e inyecta el HTML. */
const OPEN_DETAIL_JS = `(() => {
  return new Promise(resolve => {
    const span = document.querySelector("span[onclick*=ViewLicencia]") || document.querySelector('span[role=button].glyphicon-search');
    if (!span) { resolve({ok:false, error:'sin_detalle'}); return; }
    const oc = span.getAttribute('onclick') || '';
    const m = oc.match(/ViewLicencia\\(['"](.+?)['"]\\)/);
    if (!m) { span.click(); setTimeout(() => resolve({ok:true, via:'click'}), 4000); return; }
    const url = '/PersonalAereo/Personal?xid_licencia=' + encodeURIComponent(m[1]);
    fetch(url).then(r => r.text()).then(html => {
      const sec = document.querySelector('.seccionModal');
      const cont = document.querySelector('.contenedor');
      if (sec) sec.innerHTML = html;
      if (cont) { cont.classList.add('in'); cont.style.display = 'block'; cont.setAttribute('aria-hidden', 'false'); }
      resolve({ok:true, via:'fetch'});
    }).catch(e => {
      span.click();
      setTimeout(() => resolve({ok:true, via:'click'}), 4000);
    });
  });
})()`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** Verifica una licencia en SIVLAM con ventana asistida.
 *  @param BrowserWindowFactory makeWin  crea la ventana (inyectada para probar)
 *  @param object opts {tipo, numero, onStatus}
 *  @returns {ok, datos, estado, motivo, error} */
async function verificarLicencia(makeWin, opts) {
  const tipoRaw = String(opts.tipo || 'PC');
  const tipo = LIC_ABBREV[tipoRaw.toUpperCase()] || tipoRaw.toUpperCase();
  const numero = String(opts.numero || '').trim();
  const onStatus = typeof opts.onStatus === 'function' ? opts.onStatus : () => {};
  if (!numero) return { ok: false, error: 'Falta el número de licencia/DNI' };

  const child = makeWin();
  let settled = false;
  const finish = (res) => {
    if (settled) return res;
    settled = true;
    try { if (!child.isDestroyed()) child.close(); } catch (e) { /* noop */ }
    return res;
  };

  try {
    onStatus('Abriendo DGAC (SIVLAM)…');
    await child.loadURL(SIVLAM_BASE + '/Home/Verifica');
    await sleep(3000);

    // ¿redirigió a Registro? → pedir al usuario completar el registro/captcha
    for (let intento = 0; intento < 40; intento++) {
      let st = {};
      try { st = await child.webContents.executeJavaScript(STATE_JS, false); } catch (e) { st = {}; }
      if (st.enConsulta) break;
      if (intento === 0 && (st.enRegistro || /Registro/.test(st.url || ''))) {
        onStatus('Completa el registro de la DGAC en la ventana abierta (captcha incluido). La búsqueda continuará sola…');
      }
      if (child.isDestroyed()) return finish({ ok: false, error: 'cancelled' });
      await sleep(1500);
    }

    onStatus('Llenando el formulario de búsqueda…');
    await child.webContents.executeJavaScript(fillFormJS(tipo, numero), false);
    await sleep(800);

    onStatus('Buscando licencia ' + numero + '…');
    await child.webContents.executeJavaScript(CLICK_BUSCAR_JS, false);
    await sleep(3500);

    // reintentar búsqueda si no hay detalle
    for (let i = 0; i < 2; i++) {
      let has = false;
      try {
        has = await child.webContents.executeJavaScript(
          `!!(document.querySelector("span[onclick*=ViewLicencia]") || document.querySelector('span[role=button].glyphicon-search'))`, false);
      } catch (e) { has = false; }
      if (has) break;
      if (i === 0) {
        onStatus('Reintentando la búsqueda…');
        await child.webContents.executeJavaScript(CLICK_BUSCAR_JS, false);
        await sleep(3500);
      }
    }

    onStatus('Cargando el detalle de la licencia…');
    try {
      await child.webContents.executeJavaScript(OPEN_DETAIL_JS, false);
    } catch (e) { /* seguimos: quizá ya está visible */ }
    await sleep(3500);

    let datos = {};
    try { datos = await child.webContents.executeJavaScript(EXTRACT_JS, false); } catch (e) { datos = {}; }

    if (!datos || (!datos.nombre && !datos.num_licencia && !(datos.habilitaciones || []).length)) {
      return finish({ ok: false, error: 'No se encontró la licencia ' + tipo + ' N° ' + numero });
    }

    // foto (dataURL) para la ficha
    if (datos.foto) {
      try {
        const src = datos.foto.startsWith('/') ? (SIVLAM_BASE + datos.foto) : datos.foto;
        const b64 = await child.webContents.executeJavaScript(
          `(async () => { try { const r = await fetch(${JSON.stringify(src)}, {credentials:'include'}); const b = await r.blob();
             return new Promise(res => { const fr = new FileReader(); fr.onloadend = () => res(fr.result); fr.readAsDataURL(b); }); }
             catch (e) { return ''; } })()`, false);
        if (b64 && b64.startsWith('data:')) datos.foto = b64; else datos.foto = '';
      } catch (e) { datos.foto = ''; }
    }

    // clasificar vigencia de lingüística y apto médico por fecha (como el .py)
    const hoy = new Date();
    const clasifica = (arr) => (arr || []).map(x => {
      const f = parseFecha(x.fecha_vencimiento);
      if (f) x.estado = f > hoy ? 'VIGENTE' : 'VENCIDO';
      return x;
    });
    datos.linguistica = clasifica(datos.linguistica);
    datos.apto_medico = clasifica(datos.apto_medico);

    const ef = estadoFinal(datos);
    return finish({ ok: true, datos, estado: ef.estado, motivo: ef.motivo });
  } catch (e) {
    return finish({ ok: false, error: String(e && e.message ? e.message : e) });
  }
}

module.exports = { verificarLicencia, estadoFinal, LIC_ABBREV, LICENCIAS_LABELS, parseFecha };

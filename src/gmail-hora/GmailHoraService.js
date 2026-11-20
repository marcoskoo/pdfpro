/* PDFPro — gmail-hora/GmailHoraService.js (v3.2.1)
 * Adaptado del módulo «gmail-hora-recepcion» provisto por el usuario
 * (Playwright + perfil persistente de Chrome: se inicia sesión UNA vez y la
 * cookie queda guardada). Cambios respecto al original:
 *  - Usa el Chrome instalado en el sistema (channel:'chrome') — no descarga
 *    Chromium; si no hay Chrome cae al Chromium de Playwright si existe.
 *  - SIEMPRE invisible (headless): cuando Gmail pide sesión NO se abre una
 *    ventana de Chrome aparte — el proceso principal abre Gmail DENTRO de
 *    la app (ventana hija de Electron), el usuario inicia sesión ahí y las
 *    cookies cosechadas se transfieren aquí con inyectarCookies().
 *  - En búsqueda por filename: si ninguna fila visible menciona el archivo
 *    se abre la primera (todos los resultados tienen ese adjunto). En
 *    búsqueda de texto libre SOLO se abre una fila que mencione el archivo
 *    (estricto: nunca se abre un correo al azar).
 *  - copiar al portapapeles desactivado por defecto (no roba el portapapeles).
 *  - El perfil persistente va en <userData>/gmail-playwright-profile.
 * La hora se devuelve TAL COMO la muestra Gmail (texto de visualización,
 * zona de la cuenta); la conversión a epoch/UTC la hace hora.js desde el
 * proceso principal. */
'use strict';

const path = require('path');
const fs = require('fs');

let playwright = null;
try { playwright = require('playwright'); } catch (e) { /* no instalado */ }

const {
  LoginRequeridoError,
  ArchivoNoEncontradoError,
  HoraNoExtraidaError,
  ServicioNoIniciadoError
} = require('./errores');
const { baseDe, filaCoincide, nombreComparable, adjuntoCoincide } = require('./hora');

const DEFAULTS = {
  userDataDir: path.join(process.cwd(), '.gmail-playwright-profile'),
  headless: true,
  viewport: { width: 1400, height: 900 },
  timeout: 20000,
  loginTimeout: 5 * 60 * 1000,
  args: ['--disable-blink-features=AutomationControlled'],
  onProgress: () => {},
  onLoginRequired: () => {}
};

/** ¿Está el módulo Playwright disponible en esta instalación? */
function disponible() {
  return { playwright: !!playwright };
}

class GmailHoraService {
  constructor(options = {}) {
    this.opts = { ...DEFAULTS, ...options };
    this.context = null;
    this.page = null;
  }

  /** Inicia el navegador (idempotente). Prefiere el Chrome del sistema,
   *  luego el Edge de Windows (presente en todo 10/11), luego el Chromium
   *  empaquetado de Playwright y por último la ruta manual de diagnóstico
   *  (PDFPRO_GMAIL_CHROMIUM). Los navegadores de ms-playwright NO van
   *  dentro del instalador: si la revisión de %LOCALAPPDATA% no coincide
   *  con la del paquete, «Executable doesn't exist» mataba la captura en
   *  silencio — con esta cadena siempre hay un navegador en Windows. */
  async iniciar() {
    if (this.context) return this;
    if (!playwright) throw new Error('Playwright no está instalado (npm i playwright).');

    fs.mkdirSync(this.opts.userDataDir, { recursive: true });
    const base = {
      headless: this.opts.headless,
      viewport: this.opts.viewport,
      args: this.opts.args
    };
    const intentos = [];
    if (process.env.PDFPRO_GMAIL_CHROMIUM) {
      intentos.push({ etiqueta: 'ruta manual (PDFPRO_GMAIL_CHROMIUM)', opts: { ...base, executablePath: process.env.PDFPRO_GMAIL_CHROMIUM } });
    }
    intentos.push(
      { etiqueta: 'Chrome del sistema', opts: { ...base, channel: 'chrome' } },
      { etiqueta: 'Edge del sistema', opts: { ...base, channel: 'msedge' } },
      { etiqueta: 'Chromium empaquetado de Playwright', opts: { ...base } }
    );
    let ultimoError = null;
    for (const intento of intentos) {
      try {
        this.context = await playwright.chromium.launchPersistentContext(this.opts.userDataDir, intento.opts);
        this.opts.onProgress('Navegador iniciado (' + intento.etiqueta + ').');
        break;
      } catch (e) {
        ultimoError = e;
        this.context = null;
        this.opts.onProgress('Navegador no disponible: ' + intento.etiqueta + ' — ' + (e && e.message ? e.message.split('\n')[0] : e));
      }
    }
    if (!this.context) {
      throw new Error('Ningún navegador disponible para buscar en Gmail (se probó: ' +
        intentos.map((i) => i.etiqueta).join('; ') + '). Último error: ' +
        (ultimoError && ultimoError.message ? ultimoError.message.split('\n')[0] : 'desconocido'));
    }

    this.page = this.context.pages()[0] || (await this.context.newPage());
    return this;
  }

  /** Cierra el navegador. La sesión queda guardada en el perfil. */
  async cerrar(silencio) {
    if (this.context) {
      try { await this.context.close(); } catch (e) { /* ya cerrado */ }
      this.context = null;
      this.page = null;
      if (!silencio) this.opts.onProgress('Navegador cerrado. Sesión guardada en el perfil.');
    }
  }

  /** URL actual de la página (para el registro de diagnóstico). */
  urlActual() {
    try { return this.page ? this.page.url() : ''; } catch (e) { return ''; }
  }

  /** Transfiere al navegador invisible las cookies de una sesión iniciada
      en la ventana de Gmail DENTRO de la app (Electron). Recibe cookies en
      formato Electron {name,value,domain,path,secure,httpOnly,
      expirationDate,sameSite} y las convierte al formato de Playwright,
      UNA A UNA (una cookie rechazada no arruina el resto; Chromium rechaza
      SameSite=None sin Secure, así que ese par va forzado). Devuelve
      {total, ok, fallos:[…]}. Tras inyectar, la sesión queda persistida
      en el perfil. */
  async inyectarCookies(cookies) {
    this._assertIniciado();
    const lista = Array.isArray(cookies) ? cookies : [];
    let ok = 0;
    const fallos = [];
    for (const c of lista) {
      const pw = {
        name: c.name,
        value: c.value,
        domain: c.domain || 'google.com',
        path: c.path || '/',
        secure: !!c.secure,
        httpOnly: !!c.httpOnly
      };
      if (c.expirationDate) pw.expires = Math.floor(c.expirationDate); // segundos
      if (c.sameSite === 'no_restriction') { pw.sameSite = 'None'; pw.secure = true; }
      else if (c.sameSite === 'lax') pw.sameSite = 'Lax';
      else if (c.sameSite === 'strict') pw.sameSite = 'Strict';
      try {
        await this.context.addCookies([pw]);
        ok++;
      } catch (e) {
        fallos.push(`${c.name}: ${String(e.message || e).split('\n')[0].slice(0, 80)}`);
      }
    }
    if (ok) this.opts.onProgress(`Sesión transferida al navegador de búsqueda (${ok} cookies).`);
    return { total: lista.length, ok, fallos };
  }

  _assertIniciado() {
    if (!this.context || !this.page) throw new ServicioNoIniciadoError();
  }

  /* Siempre invisible: si toca login se lanza enseguida — la sesión se
     inicia en la ventana DENTRO de la app (la orquesta el proceso
     principal) y llega aquí por inyectarCookies(). */
  async _esperarLogin() {
    if (/accounts\.google\.com|signin/i.test(this.page.url())) {
      throw new LoginRequeridoError('Gmail requiere iniciar sesión.');
    }
  }

  _urlBusqueda(query) {
    return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
  }

  async _buscar(query) {
    /* v3.2.17 — la consulta se muestra en la ventana de progreso: ver la
       query EXACTA (in:inbox, filename:"…", texto libre) deja claro qué
       está haciendo la búsqueda en cada momento */
    this.opts.onProgress(`Consultando Gmail: ${query}`);
    await this.page.goto(this._urlBusqueda(query), {
      waitUntil: 'domcontentloaded',
      timeout: this.opts.timeout
    });
    /* v3.2.11 — Gmail es una SPA: los resultados (o el aviso de «sin
       resultados») aparecen DESPUÉS de domcontentloaded. Antes se
       esperaban 2,5 s fijos y con el navegador en frío (primer arranque,
       máquina lenta, antivirus) la lista aún no existía: la búsqueda
       terminaba en «archivo no encontrado» aunque el correo SÍ estaba —
       la causa real de que «la captura no se da». Ahora se espera hasta
       12 s a que haya una fila de resultado o el aviso de vacío,
       comprobando cada 400 ms si Gmail pidió sesión. */
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) {
      await this.page.waitForTimeout(400);
      await this._esperarLogin();
      const listo = await this.page.evaluate(() => {
        const re = /no se encontraron coincidencias|no se encontraron mensajes|no matches found/i;
        return document.querySelectorAll('tr.zA, [role="row"]').length > 0 || re.test(document.body.innerText || '');
      });
      if (listo) {
        /* v3.2.18 — visibilidad en la ventana de progreso: cuántos correos
           trajo la consulta (o el aviso de vacío de Gmail) */
        const n = await this.page.evaluate(() => document.querySelectorAll('tr.zA, [role="row"]').length);
        this.opts.onProgress(n > 0
          ? `Bandeja: ${n} correo(s) traídos por la consulta.`
          : 'Gmail responde: sin resultados para esta consulta.');
        return;
      }
    }
    /* v3.2.18 — 12 s sin filas NI aviso de vacío: la página no cargó bien
       o el DOM de Gmail cambió; antes este caso era INVISIBLE (la app
       parecía no hacer nada) */
    this.opts.onProgress('12 s sin resultados ni aviso de Gmail — la página no cargó del todo; se continúa con lo que haya…');
  }

  async _haySinResultados() {
    return this.page.evaluate(() => {
      const re = /no se encontraron coincidencias|no se encontraron mensajes|no matches found/i;
      return re.test(document.body.innerText || '');
    });
  }

  /** Abre el correo del archivo. `estricto` (búsqueda libre) impide abrir
      una fila que no mencione el archivo. */
  async _abrirCorreo(base, estricto) {
    const abrio = await this.page.evaluate((txt) => {
      const norm = (s) => String(s || '').toLowerCase().replace(/[\s_\-.,;:()"'¿?¡!]+/g, '');
      const n = norm(txt);
      if (!n) return false;
      const filas = Array.from(document.querySelectorAll('tr.zA, [role="row"]'));
      const fila = filas.find((r) => norm(r.innerText).indexOf(n) >= 0);
      if (!fila) return false;
      fila.click();
      return true;
    }, base);

    if (!abrio) {
      if (estricto) return false;
      /* con filename:"…" todos los resultados traen ese adjunto aunque el
         nombre no se vea en la fila: se abre el primero */
      const primero = await this.page.evaluate(() => {
        const fila = document.querySelector('tr.zA, [role="row"]');
        if (!fila) return false;
        fila.click();
        return true;
      });
      if (!primero) return false;
    }
    await this.page.waitForTimeout(1800);
    return true;
  }

  /* v3.2.11 — una sola pasada de lectura (3 estrategias); devuelve null si
     todavía no hay nada legible. La orquesta de reintentos la hace
     _extraerHora: el correo recién abierto puede tardar en renderizar. */
  async _extraerHoraUna() {
    // 1) Panel «Mostrar detalles» → fila «fecha:» (fecha completa, la fiable)
    const desdeDetalles = await this.page.evaluate(() => {
      const celdas = Array.from(document.querySelectorAll('.gI, th, td'));
      for (let i = 0; i < celdas.length; i++) {
        const etiqueta = (celdas[i].textContent || '').trim().toLowerCase();
        if (/^fecha:|^date:/.test(etiqueta)) {
          let hermano = celdas[i].nextElementSibling;
          while (hermano && !(hermano.textContent || '').trim()) {
            hermano = hermano.nextElementSibling;
          }
          const valor = (hermano && hermano.textContent || '').trim();
          if (valor) return valor;
        }
      }
      return null;
    });
    if (desdeDetalles) return { hora: desdeDetalles, fuente: 'detalles' };

    // 2) title del encabezado del mensaje abierto
    const desdeTitle = await this.page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('[title]')).find((e) => {
        const t = e.getAttribute('title') || '';
        return /\d{1,2}\s+\w+\s+\d{4}.*\d{1,2}:\d{2}/.test(t) && e.offsetParent !== null;
      });
      return el ? el.getAttribute('title') : null;
    });
    if (desdeTitle) return { hora: desdeTitle, fuente: 'titulo-mensaje' };

    // 3) title de la fila en la lista de resultados (puede ser solo la hora)
    const desdeLista = await this.page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('span[title]')).find((e) =>
        /\d{4}.*\d{1,2}:\d{2}|\d{1,2}:\d{2}/.test(e.getAttribute('title') || '')
      );
      return el ? el.getAttribute('title') : null;
    });
    if (desdeLista) return { hora: desdeLista, fuente: 'titulo-lista' };
    return null;
  }

  async _extraerHora() {
    /* v3.2.11 — hasta 8 s para leer la hora: antes se leía una sola vez
       (1,8 s tras abrir el correo) y si el mensaje aún renderizaba saltaba
       HoraNoExtraidaError y la captura terminaba en silencio. El botón
       «Mostrar detalles» se pulsa en cuanto aparece (una vez). */
    let detallePulsado = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 8000) {
      if (!detallePulsado) {
        const boton = this.page
          .locator('[aria-label="Mostrar detalles"], [data-tooltip="Mostrar detalles"]')
          .first();
        if (await boton.count()) {
          try {
            await boton.click({ timeout: 2000 });
            await this.page.waitForTimeout(600);
          } catch (_) { /* aún no clicable: se reintenta en la próxima vuelta */ }
          detallePulsado = true;
        }
      }
      const r = await this._extraerHoraUna();
      if (r) return r;
      await this.page.waitForTimeout(600);
    }
    throw new HoraNoExtraidaError();
  }

  async _extraerMeta() {
    return this.page.evaluate(() => {
      const remitente = document.querySelector('[email][name]');
      const asuntoEl = Array.from(document.querySelectorAll('span, div')).find(
        (e) => e.children.length === 0 && e.getAttribute('data-thread-id')
      );
      const adjunto = document.querySelector('.brc[title]');
      return {
        remitenteNombre: (remitente && remitente.getAttribute('name')) || null,
        remitenteCorreo: (remitente && remitente.getAttribute('email')) || null,
        asunto: (asuntoEl && asuntoEl.textContent.trim()) || null,
        archivoAdjunto: (adjunto && adjunto.getAttribute('title')) || null
      };
    });
  }

  /* v3.2.14 — Nombres de los adjuntos del correo ABIERTO. Gmail los
     muestra en chips: span.aV3 (nombre visible) y .brc[title] (el nombre
     en el title del chip); se recogen ambos y, por si el DOM cambia,
     también aria-label que contengan algo con extensión de archivo. */
  async _adjuntosAbiertos() {
    return this.page.evaluate(() => {
      const nombres = [];
      document.querySelectorAll('span.aV3').forEach((e) => {
        const t = (e.textContent || '').trim();
        if (t) nombres.push(t);
      });
      document.querySelectorAll('.brc[title]').forEach((e) => {
        const t = (e.getAttribute('title') || '').trim();
        if (t) nombres.push(t);
      });
      document.querySelectorAll('[aria-label]').forEach((e) => {
        const m = (e.getAttribute('aria-label') || '').match(/[\w\sÁÉÍÓÚáéíóúÑñ().,'\-]+\.[A-Za-z0-9]{2,5}\b/);
        if (m) nombres.push(m[0]);
      });
      return nombres;
    });
  }

  /* Espera hasta `ms` a que el correo abierto muestre sus adjuntos: el
     mensaje puede seguir renderizando y sin esta espera un correo con el
     adjunto correcto se saltaría por leer demasiado pronto. */
  async _esperarAdjuntos(ms = 4000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const n = await this.page
        .evaluate(() => document.querySelectorAll('span.aV3, .brc[title]').length)
        .catch(() => 0);
      if (n > 0) return;
      await this.page.waitForTimeout(300);
    }
  }

  /** v3.2.14 — EL ORDEN EXIGIDO POR EL USUARIO: recorre los correos
   *  RECIBIDOS del MÁS NUEVO al más VIEJO; abre cada correo y compara el
   *  nombre de CADA adjunto con el del archivo cargado (comparación
   *  normalizada: mayúsculas, espacios múltiples, signos, extensión y el
   *  «(n)» de duplicados de Gmail no importan). El PRIMER correo que
   *  hace match queda abierto y devuelve true; si en los últimos
   *  `limite` correos no está, devuelve false.
   *  Los correos sin adjunto no pueden hacer match, por eso la bandeja
   *  se filtra con has:attachment (el orden de recepción no cambia). */
  async _recorrerBandeja(archivo, limite = 40) {
    const objetivo = nombreComparable(archivo);
    if (!objetivo) return false;
    const QUERY = 'in:inbox has:attachment';
    this.opts.onProgress('Recorriendo los correos recibidos del más nuevo al más viejo…');
    await this._buscar(QUERY);
    for (let i = 0; i < limite; i++) {
      const abrio = await this.page.evaluate((idx) => {
        const todas = document.querySelectorAll('tr.zA');
        const filas = todas.length ? todas : document.querySelectorAll('[role="row"]');
        if (!filas[idx]) return false;
        filas[idx].click();
        return true;
      }, i);
      if (!abrio) return false;                // no hay más correos que recorrer
      await this.page.waitForTimeout(1500);    // render del correo abierto
      await this._esperarAdjuntos();
      const adjuntos = await this._adjuntosAbiertos();
      this.opts.onProgress(`Correo ${i + 1} de la bandeja: ${adjuntos.length ? adjuntos.join(', ') : 'sin adjuntos legibles'}`);
      if (adjuntoCoincide(archivo, adjuntos)) {
        this.opts.onProgress('¡El adjunto coincide con el archivo cargado! Extrayendo la hora de recepción…');
        return true;
      }
      /* volver a la lista SIN recargar: history.back() deja la bandeja
         lista para la siguiente fila; si no volvió, se recarga la búsqueda */
      try { await this.page.goBack({ timeout: 8000 }); } catch (_) { /* abajo se recarga */ }
      let hay = false;
      try {
        hay = await this.page.evaluate(() => document.querySelectorAll('tr.zA, [role="row"]').length > 0);
      } catch (_) { /* ídem */ }
      if (!hay) await this._buscar(QUERY);
    }
    return false;
  }

  /* El correo ya está abierto en la página: extrae la hora y los metadatos
     y arma el resultado común a ambas vías (recorrido ordenado y
     búsqueda por filename:). */
  async _resultadoDeCorreoAbierto(archivo, copiar) {
    const { hora, fuente } = await this._extraerHora();
    const meta = await this._extraerMeta();
    const copiado = copiar ? await this.copiarAlPortapapeles(hora) : false;
    this.opts.onProgress(`Hora obtenida: ${hora}`);
    return {
      archivo,
      asunto: meta.asunto || (await this.page.title()),
      horaRecepcion: hora,
      fuente,
      remitente: meta.remitenteNombre,
      remitenteCorreo: meta.remitenteCorreo,
      archivoAdjunto: meta.archivoAdjunto,
      copiadoAlPortapapeles: copiado
    };
  }

  async _buscarYExtraer(archivo, copiar) {
    const base = baseDe(archivo);
    /* v3.2.7 — el nombre real trae espacios múltiples («PV CIX LIM
       2226»): Gmail puede no devolver resultados con ellos; se
       reintenta con los espacios colapsados a uno solo antes de caer
       al texto libre. */
    const colapsada = base.replace(/\s+/g, ' ').trim();
    this.opts.onProgress(`Buscando «${archivo}»…`);

    /* v3.2.14 — ORDEN EXIGIDO POR EL USUARIO: primero se recorren los
       correos recibidos del más nuevo al más viejo comparando el nombre
       de cada adjunto con el archivo cargado; el primer match entrega su
       hora. Si en los últimos 40 no está, cae a la búsqueda por
       filename:/texto libre (correos más antiguos, o archivados por
       filtros y fuera de la bandeja de recibidos). */
    if (await this._recorrerBandeja(archivo, 40)) {
      return this._resultadoDeCorreoAbierto(archivo, copiar);
    }
    this.opts.onProgress('No estaba en los correos recientes; buscando por filename:…');

    /* v3.2.16 — el archivo DESCARGADO puede traer uno o varios «(n)» de
       duplicado («ATC CM468 11NOV (1) (1).pdf») que el adjunto original
       del correo no tiene: filename:"…" con el nombre completo fallaría
       aunque el correo sí está. Se reintenta con la base sin ninguno. */
    const sinMarcas = base.replace(/(?:\s*\(\d+\))+\s*$/, '').trim();

    await this._buscar(`filename:"${base}"`);
    let modo = 'filename';

    if ((await this._haySinResultados()) && colapsada && colapsada !== base) {
      this.opts.onProgress('Sin resultados; reintentando con espacios colapsados…');
      await this._buscar(`filename:"${colapsada}"`);
    }
    if ((await this._haySinResultados()) && sinMarcas && sinMarcas !== base && sinMarcas !== colapsada) {
      this.opts.onProgress('Sin resultados; reintentando sin los «(n)» de duplicados…');
      await this._buscar(`filename:"${sinMarcas}"`);
    }
    if (await this._haySinResultados()) {
      this.opts.onProgress('Sin resultados con filename:; probando texto libre…');
      await this._buscar((sinMarcas ? sinMarcas.replace(/\s+/g, ' ').trim() : colapsada) || base);
      modo = 'texto';
      if (await this._haySinResultados()) throw new ArchivoNoEncontradoError(archivo);
    }

    /* en texto libre NUNCA se abre un correo que no mencione el archivo
       (v3.2.16: se busca por el nombre SIN los «(n)», que es como el
       correo lo menciona — con el nombre completo descargado la fila
       nunca iba a contenerlo) */
    const abrio = await this._abrirCorreo(modo === 'texto' ? (sinMarcas || base) : base, modo === 'texto');
    if (!abrio) throw new ArchivoNoEncontradoError(archivo);

    return this._resultadoDeCorreoAbierto(archivo, copiar);
  }

  /**
   * Busca el correo por nombre de archivo y devuelve su hora de recepción
   * (texto tal como lo muestra Gmail — la zona la resuelve hora.js).
   * Si Gmail pide sesión lanza LoginRequeridoError sin reintento: la
   * sesión la resuelve el proceso principal (login dentro de la app +
   * inyectarCookies) y vuelve a llamar aquí.
   * @param {string} archivo Nombre del archivo (ej. «ATC JAP 7163.pdf»).
   * @param {{copiar?: boolean}} opciones `copiar` por defecto false.
   */
  async buscarHoraPorArchivo(archivo, opciones = {}) {
    this._assertIniciado();
    const { copiar = false } = opciones;
    return this._buscarYExtraer(archivo, copiar);
  }

  /** Copia un texto al portapapeles de la página (solo si se pide). */
  async copiarAlPortapapeles(texto) {
    this._assertIniciado();
    return this.page.evaluate(async (valor) => {
      try {
        await navigator.clipboard.writeText(valor);
        return true;
      } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = valor;
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      }
    }, texto);
  }

  /** Procesa varios archivos en la misma sesión. */
  async buscarVariasHoras(archivos, opciones = {}) {
    const resultados = [];
    for (const archivo of archivos) {
      try {
        resultados.push({ ok: true, ...(await this.buscarHoraPorArchivo(archivo, opciones)) });
      } catch (error) {
        resultados.push({ ok: false, archivo, error: error.message, tipo: error.name });
      }
    }
    return resultados;
  }
}

module.exports = GmailHoraService;
module.exports.GmailHoraService = GmailHoraService;
module.exports.disponible = disponible;
module.exports.filaCoincide = filaCoincide;
module.exports.baseDe = baseDe;

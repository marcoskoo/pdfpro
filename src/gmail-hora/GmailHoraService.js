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
const { baseDe, filaCoincide } = require('./hora');

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

  /** Inicia el navegador (idempotente). Prefiere el Chrome del sistema. */
  async iniciar() {
    if (this.context) return this;
    if (!playwright) throw new Error('Playwright no está instalado (npm i playwright).');

    fs.mkdirSync(this.opts.userDataDir, { recursive: true });
    const base = {
      headless: this.opts.headless,
      viewport: this.opts.viewport,
      args: this.opts.args
    };
    /* 1.º el Chrome instalado en el sistema (sin descargar nada);
       si falla, el Chromium empaquetado de Playwright. */
    try {
      this.context = await playwright.chromium.launchPersistentContext(this.opts.userDataDir, { ...base, channel: 'chrome' });
    } catch (e) {
      this.context = await playwright.chromium.launchPersistentContext(this.opts.userDataDir, base);
    }

    this.page = this.context.pages()[0] || (await this.context.newPage());
    this.opts.onProgress('Navegador iniciado.');
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
    await this.page.goto(this._urlBusqueda(query), {
      waitUntil: 'domcontentloaded',
      timeout: this.opts.timeout
    });
    await this.page.waitForTimeout(2500);
    await this._esperarLogin();
  }

  async _haySinResultados() {
    return this.page.evaluate(() =>
      /no se encontraron coincidencias|no matches found/i.test(document.body.innerText)
    );
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

  async _extraerHora() {
    // 1) Panel «Mostrar detalles» → fila «fecha:» (fecha completa, la fiable)
    const boton = this.page
      .locator('[aria-label="Mostrar detalles"], [data-tooltip="Mostrar detalles"]')
      .first();
    if (await boton.count()) {
      try {
        await boton.click({ timeout: 3000 });
        await this.page.waitForTimeout(600);
      } catch (_) { /* ya estaba abierto o no clicable: se lee igual */ }
    }
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

  async _buscarYExtraer(archivo, copiar) {
    const base = baseDe(archivo);
    /* v3.2.7 — el nombre real trae espacios múltiples («PV CIX LIM
       2226»): Gmail puede no devolver resultados con ellos; se
       reintenta con los espacios colapsados a uno solo antes de caer
       al texto libre. */
    const colapsada = base.replace(/\s+/g, ' ').trim();
    this.opts.onProgress(`Buscando «${archivo}»…`);
    await this._buscar(`filename:"${base}"`);
    let modo = 'filename';

    if ((await this._haySinResultados()) && colapsada && colapsada !== base) {
      this.opts.onProgress('Sin resultados; reintentando con espacios colapsados…');
      await this._buscar(`filename:"${colapsada}"`);
    }
    if (await this._haySinResultados()) {
      this.opts.onProgress('Sin resultados con filename:; probando texto libre…');
      await this._buscar(colapsada || base);
      modo = 'texto';
      if (await this._haySinResultados()) throw new ArchivoNoEncontradoError(archivo);
    }

    /* en texto libre NUNCA se abre un correo que no mencione el archivo */
    const abrio = await this._abrirCorreo(base, modo === 'texto');
    if (!abrio) throw new ArchivoNoEncontradoError(archivo);

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

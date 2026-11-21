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
const { baseDe, filaCoincide, nombreComparable, adjuntoCoincide, parseHoraGmail, ahoraZona, MESES } = require('./hora');

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
    this._horaFilaAbierta = null;   /* v3.2.35: hora de RECEPCIÓN de la última fila abierta */
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

  /** v3.2.22 — LOGIN VISIBLE EN EL NAVEGADOR REAL DEL SISTEMA, CON EL
      MISMO PERFIL PERSISTENTE DEL BUSCADOR INVISIBLE. La ventana de
      login de Electron moría en <2 s en la máquina del usuario (algo la
      cerraba antes de que pudiera verse) y la sesión de SU Chrome normal
      no es visible para la app: el almacén quedaba vacío y la búsqueda
      siempre chocaba con el muro. Aquí NO se transfiere cookie alguna:
      se abre una ventana de Chrome/Edge REAL con el perfil de búsqueda,
      el usuario inicia sesión ahí UNA vez y la sesión queda guardada en
      el perfil — la siguientes búsquedas (y los reinicios de la app) la
      encuentran activa. Devuelve {ok:true} o {ok:false, motivo}.
      Requiere llamar iniciar() de nuevo tras el éxito. */
  async loginVisible({ minutos = 10 } = {}) {
    if (!playwright) return { ok: false, motivo: 'Playwright no está instalado' };
    await this.cerrar(true);              // libera el perfil para la ventana visible
    fs.mkdirSync(this.opts.userDataDir, { recursive: true });
    /* v3.2.23 — SIN MARCA DE AUTOMATIZACIÓN: el usuario de las 09:27
       ingresó sus credenciales en la ventana de Chrome y Google las
       DENEGÓ con «este navegador o aplicación no es seguro» — Playwright
       lanza Chrome con --enable-automation (navigator.webdriver=true) y
       Google bloquea el acceso justo por eso. Se elimina esa marca
       (se descarta --enable-automation de los argumentos por defecto y
       se apaga AutomationControlled): Google ve un Chrome normal. El
       plazo sube de 5 a 10 min: credenciales + verificación en dos
       pasos + avisos toman su tiempo y el usuario quedó cortado a mitad
       del acceso. */
    const base = {
      headless: false,
      viewport: null,
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--start-maximized', '--disable-blink-features=AutomationControlled', '--no-first-run', '--no-default-browser-check']
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
    let ctx = null;
    let ultimoError = null;
    for (const intento of intentos) {
      try {
        ctx = await playwright.chromium.launchPersistentContext(this.opts.userDataDir, intento.opts);
        this.opts.onProgress('Ventana de acceso abierta (' + intento.etiqueta + ').');
        break;
      } catch (e) {
        ultimoError = e;
        ctx = null;
      }
    }
    if (!ctx) {
      return { ok: false, motivo: 'no se pudo abrir la ventana del navegador (' + String((ultimoError && ultimoError.message) || ultimoError || '').split('\n')[0] + ')' };
    }
    let cerrada = false;
    ctx.on('close', () => { cerrada = true; });
    try {
      const page = ctx.pages()[0] || await ctx.newPage();
      try {
        await page.goto('https://mail.google.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
      } catch (e) { /* el usuario navega/redirige mientras carga: no es fatal */ }
      const SESION = ['SID', 'SAPISID', 'HSID', 'SSID', 'APISID'];
      const limite = Date.now() + minutos * 60 * 1000;
      let confirmaciones = 0;
      while (Date.now() < limite) {
        if (cerrada) return { ok: false, motivo: 'ventana cerrada antes de completar el acceso' };
        let conSesion = false;
        try {
          const todas = await ctx.cookies('https://mail.google.com/');
          const nombres = new Set(todas.filter((c) => /(^|\.)google\.com$/.test(String(c.domain || '').replace(/^\./, ''))).map((c) => c.name));
          conSesion = SESION.some((n) => nombres.has(n));
        } catch (e) { /* el contexto se está cerrando */ }
        if (conSesion) {
          confirmaciones++;
          if (confirmaciones >= 2) {
            try { await ctx.close(); } catch (e) { /* ya cerrada */ }
            this.opts.onProgress('Sesión de Gmail iniciada en la ventana de acceso — queda guardada en el perfil.');
            return { ok: true };
          }
        } else {
          confirmaciones = 0;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      try { await ctx.close(); } catch (e) { /* ya cerrada */ }
      return { ok: false, motivo: 'tiempo agotado (' + minutos + ' min) sin completar el acceso' };
    } catch (e) {
      try { await ctx.close(); } catch (e2) { /* ya cerrada */ }
      return { ok: false, motivo: String((e && e.message) || e).split('\n')[0] };
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
    /* v3.2.27 — recarga REAL entre consultas: navegar de #search/a a
       #search/b es solo un cambio de hash (mismo documento) y el sondeo de
       abajo podía dar por buena la vista ANTERIOR (los resultados de otra
       consulta, o el correo abierto de la búsqueda previa). Con varios
       archivos abiertos las búsquedas se encolan una tras otra sobre el
       mismo navegador: la 2.ª leía las filas de la 1.ª y extraía la hora
       del correo EQUIVOCADO (reporte: «solo buscó la hora de 1 y la
       repite en las demás pestañas/archivos»). Pasando por about:blank se
       fuerza una carga completa: lo que aparece en pantalla pertenece
       siempre a ESTA consulta. */
    try {
      await this.page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: this.opts.timeout });
    } catch (_) { /* se fuerza la carga igual con el goto de abajo */ }
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
      una fila que no mencione el archivo. v3.2.32 — entre las filas que
      mencionan el archivo se abre la MÁS RECIENTE (orden por fecha, no por
      posición en pantalla: la lista puede traer secciones como «Resultados
      principales» que no son cronológicas). */
  async _abrirCorreo(base, estricto) {
    const orden = await this._ordenFilasPorFecha();
    /* v3.2.35 — el evaluate devuelve el ÍNDICE de la fila clicada para
       recordar su hora (la de RECEPCIÓN que muestra la lista) */
    const idxClic = await this.page.evaluate((args) => {
      const norm = (s) => String(s || '').toLowerCase().replace(/[\s_\-.,;:()"'¿?¡!]+/g, '');
      const n = norm(args.txt);
      if (!n) return -1;
      const todas = document.querySelectorAll('tr.zA');
      const filas = todas.length ? todas : document.querySelectorAll('[role="row"]');
      const idxs = args.orden.length ? args.orden : Array.from(filas).map((_, i) => i);
      const fila = idxs.map((i) => filas[i]).find((r) => r && norm(r.innerText).indexOf(n) >= 0);
      if (!fila) return -1;
      fila.click();
      return idxs.find((i) => filas[i] === fila);
    }, { txt: base, orden: orden.map((o) => o.idx) });

    if (idxClic >= 0) {
      const o = orden.find((e) => e.idx === idxClic);
      this._horaFilaAbierta = (o && o.fecha) || null;   /* v3.2.35: hora de RECEPCIÓN de la fila */
    }
    if (idxClic < 0) {
      if (estricto) return false;
      /* con filename:"…" todos los resultados traen ese adjunto aunque el
         nombre no se vea en la fila: se abre el MÁS RECIENTE */
      const clicPrimero = await this.page.evaluate((idx0) => {
        const todas = document.querySelectorAll('tr.zA');
        const filas = todas.length ? todas : document.querySelectorAll('[role="row"]');
        const fila = (idx0 != null && filas[idx0]) ? filas[idx0] : document.querySelector('tr.zA, [role="row"]');
        if (!fila) return -1;
        fila.click();
        for (let j = 0; j < filas.length; j++) if (filas[j] === fila) return j;
        return -1;
      }, orden.length ? orden[0].idx : null);
      if (clicPrimero < 0) return false;
      const o = orden.find((e) => e.idx === clicPrimero);
      this._horaFilaAbierta = (o && o.fecha) || null;   /* v3.2.35: ídem */
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

  /** v3.2.32 — fecha del título de una fila como epoch (ms) SOLO para
   *  ORDENAR. Acepta los formatos de las filas de Gmail: fecha completa
   *  con hora («sáb, 21 nov, 2:45 p. m.», «21 nov 2026, 14:45»), solo
   *  hora («2:45 p. m.» = hoy en la zona de la cuenta) y solo fecha
   *  («21 nov», «31 dic 2025» → mediodía de ese día). null si no puede. */
  _msDeTituloFila(titulo, ahora) {
    const s = String(titulo || '').replace(/\s+/g, ' ').trim();
    if (!s) return null;
    const ms = parseHoraGmail(s);           /* fecha+hora o solo hora (hoy) */
    if (ms) return ms;
    const m = s.match(/^(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]+)(?:\s+(?:de\s+)?(\d{4}))?$/i);
    if (!m) return null;
    const mes = MESES[m[2].toLowerCase()];
    if (!mes) return null;
    const dia = parseInt(m[1], 10);
    if (dia < 1 || dia > 31) return null;
    let anio = m[3] ? parseInt(m[3], 10) : ahora.anio;
    if (!m[3] && mes > ahora.mes) anio--;   /* «31 dic» visto en enero: año pasado */
    return Date.UTC(anio, mes - 1, dia, 12, 0) + 300 * 60000;   /* mediodía Lima → UTC */
  }

  /** v3.2.32 — ordena [{idx, fecha}] del MÁS RECIENTE al más VIEJO (la
   *  regla del usuario: la búsqueda va del último correo recibido al
   *  penúltimo y sucesivamente). Empates o fechas ilegibles conservan el
   *  orden del DOM; las filas sin fecha quedan tras las fechadas. */
  _ordenarInfoPorFecha(info) {
    const ahora = ahoraZona(-300);          /* Lima, la zona de la cuenta */
    return info
      .map((f, dom) => ({ idx: f.idx, fecha: f.fecha || '', dom, ms: this._msDeTituloFila(f.fecha, ahora) }))
      .sort((a, b) => {
        if (a.ms != null && b.ms != null && a.ms !== b.ms) return b.ms - a.ms;
        if (a.ms != null && b.ms == null) return -1;
        if (a.ms == null && b.ms != null) return 1;
        return a.dom - b.dom;
      });
  }

  /** v3.2.32 — lee las filas de la lista ACTUAL con su fecha y devuelve
   *  [{idx, fecha}] ordenado del MÁS RECIENTE al más VIEJO. Gmail puede
   *  mostrar secciones no cronológicas («Resultados principales» antes de
   *  los «Más recientes»): el orden del DOM NO es garantía de orden por
   *  fecha, y la captura exige empezar por el correo más nuevo. */
  async _ordenFilasPorFecha() {
    let info = [];
    try {
      info = await this.page.evaluate(() => {
        /* solo títulos que SON una fecha: fecha±año±hora, o solo hora.
           Los títulos de remitentes o adjuntos («3122 LIM
           ACTUALIZADO.pdf», «Correo de Juan») no casan con el patrón. */
        const RE_FILA = /^(?:(?:lun|mar|mié|jue|vie|sáb|dom)[a-z]*,?\s*)?(?:\d{1,2}\s+(?:de\s+)?[a-záéíóúñ]+(?:\s+(?:de\s+)?\d{4})?(?:\s*,?\s*\d{1,2}:\d{2}(?:\s*(?:a|p)\.?\s*m\.?)?)?|\d{1,2}:\d{2}(?:\s*(?:a|p)\.?\s*m\.?)?)$/i;
        const todas = document.querySelectorAll('tr.zA');
        const filas = todas.length ? todas : document.querySelectorAll('[role="row"]');
        return Array.from(filas).map((f, idx) => {
          /* la fecha es el ÚLTIMO span[title] de la fila que parece fecha */
          const spans = Array.from(f.querySelectorAll('span[title]'))
            .map((s) => (s.getAttribute('title') || '').replace(/\s+/g, ' ').trim())
            .filter((t) => RE_FILA.test(t));
          return { idx, fecha: spans.length ? spans[spans.length - 1] : '' };
        });
      });
    } catch (_) { /* sin fechas legibles: queda el orden del DOM */ }
    return this._ordenarInfoPorFecha(info);
  }

  /** v3.2.14 — EL ORDEN EXIGIDO POR EL USUARIO: recorre los correos
   *  RECIBIDOS del MÁS NUEVO al más VIEJO; abre cada correo y compara el
   *  nombre de CADA adjunto con el del archivo cargado (comparación
   *  normalizada: mayúsculas, espacios múltiples, signos, extensión y el
   *  «(n)» de duplicados de Gmail no importan). El PRIMER correo que
   *  hace match queda abierto y devuelve true; si en los últimos
   *  `limite` correos no está, devuelve false.
   *  Los correos sin adjunto no pueden hacer match, por eso la bandeja
   *  se filtra con has:attachment (el orden de recepción no cambia).
   *  v3.2.32 — el orden ya no se confía al DOM: se lee la fecha de cada
   *  fila y se visita del MÁS RECIENTE al más VIEJO (último, penúltimo,
   *  sucesivamente), aunque Gmail pinche secciones no cronológicas
   *  («Resultados principales») antes que los correos por fecha. */
  async _recorrerBandeja(archivo, limite = 40) {
    const objetivo = nombreComparable(archivo);
    if (!objetivo) return false;
    const QUERY = 'in:inbox has:attachment';
    this.opts.onProgress('Recorriendo los correos recibidos del más nuevo al más viejo…');
    await this._buscar(QUERY);
    const orden = await this._ordenFilasPorFecha();
    for (let k = 0; k < limite && k < orden.length; k++) {
      const i = orden[k].idx;
      const abrio = await this.page.evaluate((idx) => {
        const todas = document.querySelectorAll('tr.zA');
        const filas = todas.length ? todas : document.querySelectorAll('[role="row"]');
        if (!filas[idx]) return false;
        filas[idx].click();
        return true;
      }, i);
      if (!abrio) return false;                // no hay más correos que recorrer
      this._horaFilaAbierta = orden[k].fecha || null;   /* v3.2.35: hora de RECEPCIÓN de la fila abierta */
      await this.page.waitForTimeout(1500);    // render del correo abierto
      await this._esperarAdjuntos();
      const adjuntos = await this._adjuntosAbiertos();
      this.opts.onProgress(`Correo ${k + 1} de la bandeja${orden[k].fecha ? ' · ' + orden[k].fecha : ''}: ${adjuntos.length ? adjuntos.join(', ') : 'sin adjuntos legibles'}`);
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
  /* v3.2.31 — PRIMERO la hora del MENSAJE que trae el adjunto: en un hilo
     (conversación con respuestas) el adjunto puede estar en un mensaje
     ANTERIOR al último, y la hora del hilo (cabecera, último mensaje o el
     «Mostrar detalles» del primero que aparezca) NO es la de recepción del
     archivo — reporte real: tres archivos descargados de correos distintos
     recibieron TODOS la hora del correo más nuevo del hilo.
     v3.2.35 — la hora del MENSAJE es la de su cabecera, que Gmail pinta
     del Date header del REMITENTE (hora de ENVÍO): si el sistema AIS
     despacha con retraso o con la fecha del depósito (reporte: pv2066
     recibido 21/11 10:34 UTC, Date header 20/11 10:22 UTC), esa hora NO
     es la de recepción. Devuelve además `esUltimo`: si el adjunto está en
     el ÚLTIMO mensaje del hilo (o es un correo suelto), la FILA de la
     lista muestra la RECEPCIÓN de ESE mensaje y manda sobre la cabecera
     (ver _decidirHoraCorreo). */
  async _extraerHoraMensajeAdjunto(archivo) {
    const objetivo = nombreComparable(archivo);
    if (!objetivo) return null;
    try {
      /* expandir el hilo completo: los mensajes colapsados no exponen la
         fecha completa en su cabecera */
      try {
        const btn = this.page
          .locator('[aria-label="Expandir todos"], [data-tooltip="Expandir todos"]')
          .first();
        if (await btn.count()) {
          await btn.click({ timeout: 2000 });
          await this.page.waitForTimeout(800);
        }
      } catch (_) { /* sin botón: hilo de un solo mensaje o ya expandido */ }
      return await this.page.evaluate((obj) => {
        const norm = (s) => String(s || '').toLowerCase().replace(/[\s_\-.,;:()"'¿?¡!]+/g, '');
        const comparable = (s) =>
          norm(String(s || '').replace(/\.[^.\\/]+$/, '').replace(/(?:\s*\(\d+\))+\s*$/, ''));
        const RE_HORA = /\d{1,2}:\d{2}/;
        const RE_ANIO = /\d{4}/;
        /* chips de adjunto (mismas fuentes que _adjuntosAbiertos): el texto
           COMPLETO del nombre visible o del title del chip (la comparación
           comparable quita extensión, signos y «(n)»; una regex de recorte
           partiría nombres con «:», como «PV SPHI - SPRU : PAUCAR .pdf»),
           y para aria-labels la mención de archivo que contengan */
        const chips = Array.from(
          document.querySelectorAll('span.aV3, .brc[title], [aria-label]')
        ).filter((e) => {
          let txt = '';
          if (e.matches('span.aV3')) txt = e.textContent || '';
          else if (e.matches('.brc[title]')) txt = e.getAttribute('title') || '';
          else if (e.getAttribute('aria-label')) {
            const m = String(e.getAttribute('aria-label')).match(/[\w\sÁÉÍÓÚáéíóúÑñ().,'\-]+\.[A-Za-z0-9]{2,5}\b/);
            txt = m ? m[0] : '';
          }
          return !!txt && comparable(txt) === obj;
        });
        if (!chips.length) return null;
        /* de cada chip sube hasta el MENSAJE que lo contiene: el ancestro
           más cercano con una fecha COMPLETA (año + hora) en un [title] de
           su cabecera. El hilo pinta los mensajes del más viejo (arriba) al
           más nuevo (abajo): se queda con el ÚLTIMO que resuelve = el más
           nuevo que trae el adjunto (la regla del usuario). */
        let mejor = null, cont = null;
        for (const chip of chips) {
          let n = chip;
          while (n && n !== document.body) {
            const titulos = Array.from(n.querySelectorAll('[title]'))
              .map((x) => x.getAttribute('title') || '')
              .filter((x) => RE_HORA.test(x) && RE_ANIO.test(x));
            if (titulos.length) {
              mejor = titulos.sort((a, b) => b.length - a.length)[0];
              cont = n;
              break;
            }
            n = n.parentElement;
          }
        }
        if (!mejor) return null;
        /* v3.2.35 — ¿el mensaje que trae el adjunto es el ÚLTIMO del hilo?
           El último elemento del documento con fecha completa en [title]
           debe estar DENTRO de su contenedor (los mensajes se pintan de
           viejo a nuevo). Si lo es, la FILA de la lista muestra la
           RECEPCIÓN de ese mismo mensaje y manda sobre su cabecera. */
        const conFecha = Array.from(document.querySelectorAll('[title]'))
          .filter((x) => {
            const t = x.getAttribute('title') || '';
            return RE_HORA.test(t) && RE_ANIO.test(t);
          });
        const ultimo = conFecha.length ? conFecha[conFecha.length - 1] : null;
        const esUltimo = !!(ultimo && cont && (cont === ultimo || cont.contains(ultimo)));
        return { hora: mejor, esUltimo };
      }, objetivo);
    } catch (_) { return null; }
  }

  /* v3.2.35 — LA HORA DE RECEPCIÓN ES LA DE LA FILA DE LA LISTA: Gmail
   *  pinta en la bandeja la hora a la que RECIBIÓ el correo
   *  (internalDate), que es la que el usuario llama «hora de recepción».
   *  La cabecera del mensaje abierto, en cambio, es el Date header del
   *  REMITENTE (hora de envío): con despachos retrasados o relojes
   *  descuadrados del sistema AIS difieren (reporte: pv2066 recibido
   *  21/11 10:34 UTC, Date header 20/11 10:22 UTC — se capturaba
   *  10:22). Regla: si el adjunto está en el ÚLTIMO mensaje del hilo (o
   *  es un correo suelto), la fila muestra la recepción de ESE mensaje y
   *  manda siempre que traiga hora; si el adjunto está en un mensaje
   *  ANTERIOR (regla 3.2.31), la fila marca la recepción de OTRO más
   *  nuevo y se mantiene la hora de la cabecera de ese mensaje.
   *  v3.2.36 — pero esa cabecera es la hora de ENVÍO del remitente: si el
   *  adjunto está en un mensaje anterior del hilo, se RE-BUSCA por
   *  filename:"…" para leer en su propia fila de resultados (por mensaje,
   *  con su RECEPCIÓN) la hora del correo que trae el archivo
   *  (ver _horaFilaDelMensaje) y solo si falla se queda con la cabecera. */
  _decidirHoraCorreo(delMensaje, esUltimo, horaFila) {
    if (esUltimo && horaFila && /\d{1,2}:\d{2}/.test(horaFila)) {
      return { hora: horaFila, fuente: 'fila-recepcion' };
    }
    return { hora: delMensaje, fuente: 'mensaje-del-adjunto' };
  }

  /* v3.2.36 — consultas filename:"…" para re-buscar el MENSAJE que trae el
   *  archivo: la base tal cual, la de espacios colapsados y la sin los
   *  «(n)» de duplicados del archivo descargado (el adjunto del correo no
   *  los tiene — «pv2066 1200 (2)» vs «pv2066 1200.pdf»). Únicas y en ese
   *  orden de preferencia. */
  _consultasFilename(archivo) {
    const base = baseDe(archivo);
    const lista = [base, base.replace(/\s+/g, ' ').trim(), base.replace(/(?:\s*\(\d+\))+\s*$/, '').trim()]
      .filter((q) => q && q.length > 2);
    return [...new Set(lista)];
  }

  /* v3.2.36 — hora de RECEPCIÓN del MENSAJE que trae el archivo cuando es
   *  un mensaje ANTERIOR de un hilo: la fila de la bandeja marca la
   *  recepción del ÚLTIMO correo del hilo (otro mensaje), así que se
   *  re-busca por filename:"…" — los resultados de búsqueda de Gmail son
   *  por MENSAJE y su fila muestra la RECEPCIÓN (internalDate) de ese
   *  mensaje — y se abre el MÁS RECIENTE (regla del usuario). Devuelve la
   *  hora de esa fila, o null si no se consigue (se queda con la cabecera).
   *  v3.2.37 — la primera consulta (la base con «(n)» del duplicado
   *  descargado) casi nunca tiene resultados, y con Gmail lento NO
   *  aparece ni el aviso de «Ningún resultado» (reporte 18:17: «12 s sin
   *  resultados ni aviso de Gmail — la página no cargó del todo»), así que
   *  una consulta sin filas YA NO se da por buena: se espera a que la
   *  página pinte (aviso o filas) y si no hay filas se pasa a la SIGUIENTE
   *  consulta (la sin «(n)», que sí trae los correos del archivo). */
  async _horaFilaDelMensaje(archivo) {
    try {
      let orden = [];
      for (const q of this._consultasFilename(archivo)) {
        await this._buscar(`filename:"${q}"`);
        for (let i = 0; i < 5; i++) {
          if (await this._haySinResultados()) break;          /* aviso → sin resultados */
          orden = await this._ordenFilasPorFecha();
          if (orden.length) break;                            /* filas → la lista está */
          await this.page.waitForTimeout(2500);               /* aún pintándose */
        }
        if (orden.length) break;                              /* esta consulta sirvió */
      }
      if (!orden.length) return null;
      const abrio = await this.page.evaluate((idx) => {
        const todas = document.querySelectorAll('tr.zA');
        const filas = todas.length ? todas : document.querySelectorAll('[role="row"]');
        if (!filas[idx]) return false;
        filas[idx].click();
        return true;
      }, orden[0].idx);
      if (!abrio) return null;
      await this.page.waitForTimeout(1500);
      await this._esperarAdjuntos();
      /* la vista abierta debe seguir trayendo el adjunto (v3.2.27): si no,
         esa fila no es la de este archivo */
      if (!adjuntoCoincide(archivo, await this._adjuntosAbiertos())) return null;
      const hora = orden[0].fecha || null;
      return (hora && /\d{1,2}:\d{2}/.test(hora)) ? hora : null;
    } catch (_) { return null; }
  }

  async _resultadoDeCorreoAbierto(archivo, copiar) {
    const delMensaje = await this._extraerHoraMensajeAdjunto(archivo);
    if (delMensaje) {
      let eleccion = this._decidirHoraCorreo(delMensaje.hora, delMensaje.esUltimo, this._horaFilaAbierta);
      /* v3.2.37 — meta del correo emparejado ANTES de re-buscar: si la
         re-búsqueda falla, la vista puede haber quedado en la página de
         resultados y el asunto saldría «Resultados de búsqueda…» (reporte
         18:17). Si la re-búsqueda abre OTRO correo (el más reciente con el
         archivo), su meta es la que va en el resultado. */
      let meta = await this._extraerMeta();
      if (eleccion.fuente === 'mensaje-del-adjunto') {
        /* v3.2.36 — el adjunto está en un mensaje ANTERIOR del hilo (o la
           fila no traía hora): la fila de la bandeja es de OTRO correo más
           nuevo y la cabecera es la hora de ENVÍO del remitente. Se
           re-busca por filename: para leer la RECEPCIÓN del mensaje del
           archivo en su propia fila de resultados; si no se consigue, se
           queda con la cabecera (comportamiento 3.2.31). */
        const filaMsj = await this._horaFilaDelMensaje(archivo);
        if (filaMsj) {
          eleccion = { hora: filaMsj, fuente: 'fila-recepcion' };
          meta = await this._extraerMeta();
        }
      }
      const copiado = copiar ? await this.copiarAlPortapapeles(eleccion.hora) : false;
      this.opts.onProgress(`Hora obtenida: ${eleccion.hora} (${eleccion.fuente === 'fila-recepcion' ? 'hora de RECEPCIÓN de la lista de Gmail' : 'del mensaje que trae el adjunto'})`);
      return {
        archivo,
        asunto: meta.asunto || (await this.page.title()),
        horaRecepcion: eleccion.hora,
        fuente: eleccion.fuente,
        remitente: meta.remitenteNombre,
        remitenteCorreo: meta.remitenteCorreo,
        archivoAdjunto: meta.archivoAdjunto,
        copiadoAlPortapapeles: copiado
      };
    }
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
    this._horaFilaAbierta = null;   /* v3.2.35: la fila es de ESTE archivo (nada heredado del anterior) */
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

    /* v3.2.27 — el correo abierto DEBE ser el de ESTE archivo antes de usar
       su hora: si la vista quedó mostrando el correo de una búsqueda
       anterior (las consultas de varios archivos se encolan sobre el mismo
       navegador), la hora extraída sería la de OTRO vuelo. Con filename:
       los resultados traen el adjunto buscado; en texto libre el correo
       lo menciona. Si el adjunto no coincide, no es este correo: no se
       usa su hora (la re-búsqueda lo intentará de nuevo). */
    await this._esperarAdjuntos();
    const adjuntosAbiertos = await this._adjuntosAbiertos();
    if (!adjuntoCoincide(archivo, adjuntosAbiertos)) {
      this.opts.onProgress(`El correo abierto no trae «${archivo}» como adjunto — no se usa su hora`);
      throw new ArchivoNoEncontradoError(archivo);
    }

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

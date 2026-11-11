/* PDFPro — desktop-bridge.js
 * Se carga tras todos los scripts de la app y solo actúa en el escritorio.
 * Ajustes de integración con Electron:
 *   1) Archivos abiertos desde Windows (cola hasta iniciar sesión)
 *   2) OAuth de Google Drive con ventana nativa (sin popups bloqueables)
 *   3) OCR 100% offline (worker, núcleo WASM e idiomas locales)
 *   4) Fuentes Fontsource locales al exportar PDF (sin jsdelivr)
 *   5) Aviso de descargas completadas
 */
(function () {
  'use strict';
  if (!window.pdfproDesktop) return; // ejecutándose en navegador web normal
  var D = window.pdfproDesktop;

  function mimeFor(name) {
    var e = (String(name).split('.').pop() || '').toLowerCase();
    var m = {
      pdf: 'application/pdf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
      xls: 'application/vnd.ms-excel',
      csv: 'text/csv',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword'
    };
    return m[e] || 'application/octet-stream';
  }

  /* ── 1) Archivos abiertos desde el sistema ── */
  var pendingFiles = [];
  function editorActive() {
    try {
      var el = document.getElementById('editorLayer');
      return !!(window.currentUser && el && el.style.display !== 'none' && el.style.display !== '');
    } catch (e) { return false; }
  }
  function tryOpen(file) {
    if (typeof openFilesList !== 'function') return false;
    try { openFilesList([file]); return true; } catch (e) { console.error('Abrir archivo:', e); return false; }
  }
  function flushPending() {
    while (pendingFiles.length && editorActive()) {
      var f = pendingFiles.shift();
      if (!tryOpen(f)) { pendingFiles.unshift(f); break; }
    }
  }
  D.onOpenFile(function (f) {
    if (!f || !f.buffer) return;
    var file;
    try {
      file = new File([f.buffer], f.name, { type: mimeFor(f.name) });
    } catch (e) {
      // navegadores sin constructor File(ArrayBuffer,…)
      var blob = new Blob([f.buffer], { type: mimeFor(f.name) });
      blob.name = f.name;
      file = blob;
    }
    if (editorActive() && tryOpen(file)) return;
    pendingFiles.push(file);
    if (!window.currentUser && typeof toast === 'function') {
      toast('Inicia sesión para abrir «' + f.name + '»', 'warn');
    }
  });
  setInterval(flushPending, 1500);
  // también al terminar de entrar al editor
  window.addEventListener('load', function () {
    if (document.readyState === 'complete') D.ready();
    flushPending();
  });
  if (document.readyState === 'complete') D.ready();

  /* ── 2) OAuth de Google Drive nativo ── */
  if (typeof gdriveConnect === 'function' && typeof GDRIVE_CLIENT_ID !== 'undefined') {
    window.gdriveConnect = function (callback) {
      var redirectUri = gdriveGetRedirectUri();
      var state = Math.random().toString(36).slice(2);
      sessionStorage.setItem('gdrive_state', state);
      sessionStorage.setItem('gdrive_callback', 'pending');
      var authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
        'client_id=' + encodeURIComponent(GDRIVE_CLIENT_ID) +
        '&redirect_uri=' + encodeURIComponent(redirectUri) +
        '&response_type=code' +
        '&scope=' + encodeURIComponent(GDRIVE_SCOPES) +
        '&access_type=offline' +
        '&prompt=consent' +
        '&state=' + state;
      if (typeof toast === 'function') toast('Abriendo inicio de sesión de Google…', '');
      D.openAuthPopup(authUrl).then(function (res) {
        if (!res || res.error) {
          if (res && res.error === 'timeout') toast('Tiempo de espera agotado al conectar Drive', 'err');
          else toast('Conexión con Google cancelada', 'warn');
          return null;
        }
        if (res.state !== sessionStorage.getItem('gdrive_state')) {
          toast('Error OAuth: state mismatch', 'err');
          return null;
        }
        return fetch(GDRIVE_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
          body: JSON.stringify({ code: res.code, redirect_uri: redirectUri })
        }).then(function (r) { return r.json(); });
      }).then(function (data) {
        if (!data) return;
        if (data.error) { toast('Error OAuth: ' + data.error, 'err'); return; }
        gdriveToken = data.access_token;
        var exp = parseInt(data.expires_in || 3600);
        gdriveTokenExpiry = Date.now() + (exp - 60) * 1000;
        sessionStorage.removeItem('gdrive_state');
        sessionStorage.removeItem('gdrive_callback');
        toast('✅ Google Drive conectado', 'ok');
        updateDriveConnectBtn();
        loadNotifications().catch(function (e) { });
        if (callback) callback();
      }).catch(function (e) {
        toast('Error al conectar Drive', 'err');
        console.error(e);
      });
    };
  }

  /* ── 3) OCR offline (worker + núcleo + idiomas locales) ── */
  if (window.Tesseract && typeof Tesseract.createWorker === 'function') {
    var _tessBase = new URL('vendor/tesseract/', location.href).href;
    var _tessWorkers = {};
    var _tessLogger = {};
    var _origRecognize = Tesseract.recognize ? Tesseract.recognize.bind(Tesseract) : null;

    function getTessWorker(langs, logger) {
      if (!_tessWorkers[langs]) {
        _tessLogger[langs] = logger || null;
        _tessWorkers[langs] = Tesseract.createWorker(langs, undefined, {
          workerPath: _tessBase + 'worker.min.js',
          corePath: _tessBase + 'core',
          langPath: _tessBase + 'lang',
          workerBlobURL: false,
          logger: function (m) {
            if (typeof _tessLogger[langs] === 'function') _tessLogger[langs](m);
          }
        });
      } else {
        _tessLogger[langs] = logger || null;
      }
      return _tessWorkers[langs];
    }

    Tesseract.recognize = function (image, langs, options) {
      langs = langs || 'eng';
      var w;
      return Promise.resolve()
        .then(function () { return getTessWorker(langs, options && options.logger); })
        .then(function (worker) {
          w = worker;
          return w.recognize(image);
        })
        .catch(function (err) {
          console.warn('OCR local no disponible, probando CDN:', err);
          // reintento con el comportamiento original (requiere internet)
          if (_origRecognize) return _origRecognize(image, langs, options);
          throw err;
        });
    };
  }

  /* ── 4) Fuentes Fontsource locales (exportar PDF sin internet) ── */
  if (typeof WZ_FAMSRC !== 'undefined') {
    window._wzWoffUrl = function (fam, bold, ital) {
      var p = WZ_FAMSRC[fam];
      if (!p) return null;
      return new URL(
        'vendor/fontsource/' + p + '-latin-' + (bold ? '700' : '400') + '-' + (ital ? 'italic' : 'normal') + '.woff',
        location.href
      ).href;
    };
  }

  /* ── 5) Aviso de descargas completadas ── */
  if (D.onDownloadDone) {
    D.onDownloadDone(function (info) {
      if (!info) return;
      if (info.ok) toast('Descarga completada: ' + info.name, 'ok');
      else toast('Descarga cancelada o fallida: ' + info.name, 'err');
    });
  }

  /* ── 6) prompt() no existe en Electron → modal propio ──
     La app usa prompt() en: token de recuperación, nueva contraseña y zoom. */
  function desktopPrompt(message, defaultValue, isPassword) {
    return new Promise(function (resolve) {
      var old = document.getElementById('pdfpro-prompt-overlay');
      if (old) old.remove();
      var ov = document.createElement('div');
      ov.id = 'pdfpro-prompt-overlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;' +
        'display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif';
      var box = document.createElement('div');
      box.style.cssText = 'width:min(420px,92vw);background:#17191e;border:1px solid #3a3e4d;' +
        'border-radius:12px;box-shadow:0 12px 44px rgba(0,0,0,.7);padding:18px';
      var msg = document.createElement('div');
      msg.textContent = message;
      msg.style.cssText = 'color:#dde0ea;font-size:13px;font-weight:600;margin-bottom:12px';
      var inp = document.createElement('input');
      inp.type = isPassword ? 'password' : 'text';
      inp.value = defaultValue || '';
      inp.style.cssText = 'width:100%;box-sizing:border-box;background:#1f2128;border:1.5px solid #3a3e4d;' +
        'border-radius:8px;color:#dde0ea;padding:10px 13px;font-size:13px;outline:none;font-family:Inter,sans-serif';
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:14px';
      function mkBtn(txt, primary) {
        var b = document.createElement('button');
        b.textContent = txt;
        b.style.cssText = 'padding:8px 18px;border-radius:8px;border:none;cursor:pointer;' +
          'font-weight:700;font-size:12.5px;font-family:Inter,sans-serif;' +
          (primary
            ? 'background:#4f8ef7;color:#fff'
            : 'background:transparent;border:1.5px solid #3a3e4d;color:#8590a4');
        return b;
      }
      var btnCancel = mkBtn('Cancelar', false);
      var btnOk = mkBtn('Aceptar', true);
      row.appendChild(btnCancel);
      row.appendChild(btnOk);
      box.appendChild(msg);
      box.appendChild(inp);
      box.appendChild(row);
      ov.appendChild(box);
      document.body.appendChild(ov);
      inp.focus();
      if (!isPassword) inp.select();
      function done(val) {
        ov.remove();
        document.removeEventListener('keydown', onKey, true);
        resolve(val);
      }
      function onKey(e) {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); done(inp.value); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null); }
      }
      document.addEventListener('keydown', onKey, true);
      btnOk.addEventListener('click', function () { done(inp.value); });
      btnCancel.addEventListener('click', function () { done(null); });
      ov.addEventListener('mousedown', function (e) { if (e.target === ov) done(null); });
    });
  }

  if (typeof promptZoom === 'function') {
    window.promptZoom = function () {
      var def = String(Math.round(scale * 100));
      desktopPrompt('Zoom % (20-400):', def).then(function (v) {
        if (v != null && +v >= 20 && +v <= 400) setZoom(+v / 100);
      });
    };
  }
  if (typeof showResetTokenForm === 'function') {
    window.showResetTokenForm = function () {
      desktopPrompt('Ingresa el token de restablecimiento:', '').then(function (token) {
        if (!token) return null;
        return desktopPrompt('Nueva contraseña (mínimo 6 caracteres):', '', true)
          .then(function (newPass) { return { token: token, newPass: newPass }; });
      }).then(function (r) {
        if (!r) return;
        if (!r.newPass || r.newPass.length < 6) { toast('Contraseña muy corta.', 'err'); return; }
        getSb().rpc('reset_password_with_token', { p_token: r.token.trim(), p_new_pass: r.newPass })
          .then(function (res) {
            if (res.error || res.data !== 'OK') { toast('Token inválido o expirado', 'err'); return; }
            toast('✅ Contraseña restablecida. Inicia sesión.', 'ok');
            hideForgotPass();
          });
      });
    };
  }
  // por si aparecen más usos de prompt() en el futuro: registrar aviso en consola
  window.prompt = function () {
    console.warn('prompt() no está soportado en la versión de escritorio');
    return null;
  };
})();

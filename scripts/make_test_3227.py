# Genera scripts/test_gmail_hora_3227.js a partir del de v3.2.26:
# v3.2.27 — LA HORA QUE SE APLICA ES DEL CORREO DE ESE ARCHIVO. Reporte:
# «solo buscó la hora de recepción de 1, y lo repite en las demás
# pestañas/archivos». Navegar de #search/a a #search/b es solo un cambio
# de hash (mismo documento): el sondeo veía la vista ANTERIOR y la hora
# extraída era la del correo que quedó abierto (el del archivo 1).
# (1) _buscar recarga REAL (about:blank → #search/consulta) en cada
#     consulta; (2) _buscarYExtraer verifica que el correo abierto trae
#     el archivo como adjunto (adjuntoCoincide) antes de usar su hora.
# 418 + 4 = 422.
import sys

src = open('scripts/test_gmail_hora_3226.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces, esperaba {n}): {old[:80]!r}')
    out = out.replace(old, new)

# 1) cabecera
i = out.index('/* Pruebas v3.2.26')
j = out.index('*/', i) + 2
out = out[:i] + """/* Pruebas v3.2.27 — LA HORA QUE SE APLICA ES DEL CORREO DE ESE ARCHIVO.
   Reporte del usuario: «solo buscó la hora de recepción de 1, y lo
   repite en las demás pestañas/archivos». Causa en el código real: con
   varios archivos abiertos las búsquedas se encolan sobre el MISMO
   navegador invisible, y navegar de #search/a a #search/b es solo un
   cambio de hash (mismo documento) — el sondeo de _buscar daba por
   buena la vista ANTERIOR (resultados de otra consulta o el correo
   ABIERTO de la búsqueda previa) y se extraía la hora del correo
   equivocado: la del archivo 1, repetida en todas las pestañas.
   (1) _buscar pasa por about:blank antes de cada consulta (recarga
   real: lo que aparece pertenece siempre a ESTA consulta);
   (2) _buscarYExtraer VERIFICA que el correo abierto trae el archivo
   como adjunto (adjuntoCoincide) antes de usar su hora — si no es su
   correo, ArchivoNoEncontrado y re-búsqueda. Incluye la regresión
   completa v3.2.26 (418 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3227.js */""" + out[j:]

# 2) banner
rep(r"""T('banner v3.2.26', /CORPAC AIS\/ARO Platform v3\.2\.26/.test(html), true);""",
    r"""T('banner v3.2.27', /CORPAC AIS\/ARO Platform v3\.2\.27/.test(html), true);""")

# 3) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.27 — la hora es del correo de ESE archivo ════ */
  console.log('── v3.2.27: cada consulta recarga de verdad; la hora se verifica contra el correo abierto ──');
  T('servicio: _buscar pasa por about:blank ANTES de cada consulta (recarga real: la vista anterior ya no vale por lista)',
    svcjs.includes("await this.page.goto('about:blank'") && /about:blank'[\s\S]{0,300}_urlBusqueda\(query\)/.test(svcjs), true);
  T('servicio: el paso por about:blank tolera fallos (se fuerza la carga igual con el goto de la consulta)',
    /try \{\s*\n\s*await this\.page\.goto\('about:blank'[\s\S]{0,200}\} catch \(_\) \{[\s\S]{0,120}\}/.test(svcjs), true);
  T('servicio: la 2.ª verificación — el correo ABIERTO debe traer el archivo como adjunto antes de usar su hora',
    /const abrio = await this\._abrirCorreo\(modo === 'texto' \? \(sinMarcas \|\| base\) : base, modo === 'texto'\);\s*\n\s*if \(!abrio\) throw new ArchivoNoEncontradoError\(archivo\);\s*\n\s*\/\* v3\.2\.27[\s\S]{0,600}if \(!adjuntoCoincide\(archivo, adjuntosAbiertos\)\) \{/.test(svcjs) && svcjs.includes('const adjuntosAbiertos = await this._adjuntosAbiertos();'), true);
  T('servicio: si el adjunto no coincide NO se usa la hora (ArchivoNoEncontrado → re-búsqueda), y el aviso lo dice',
    /if \(!adjuntoCoincide\(archivo, adjuntosAbiertos\)\) \{\s*\n\s*this\.opts\.onProgress\(`El correo abierto no trae «\$\{archivo\}» como adjunto — no se usa su hora`\);\s*\n\s*throw new ArchivoNoEncontradoError\(archivo\);\s*\n\s*\}/.test(svcjs), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3227.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3227.js generado')

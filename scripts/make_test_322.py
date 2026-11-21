# Genera scripts/test_gmail_hora_322.js a partir del de v3.2.1:
# v3.2.2 — regla +05 explícita (Lima UTC−5 → UTC): 07:00 → 12:00, cruces de
# medianoche con avance de fecha, y toast que MUESTRA la conversión (hora de
# Gmail tal como la presentó + resultado UTC aplicado).
# Regresión 166 de v3.2.1 íntegra.
import sys

src = open('scripts/test_gmail_hora_321.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.1 — HORA DEL CORREO POR ARCHIVO CARGADO (corrección de la
   v3.2.0): los fallos reales ahora se MUESTRAN (login cancelado, sesión no
   transferida, hora leída pero no interpretada) — solo calla «no hay
   correo» y «correo sin hora». Inyección de cookies cookie-a-cookie
   (SameSite=None viaja con Secure forzado; una rechazada no arrastra a las
   demás), reintento ×2 con re-cosecha, ventana de login se cierra sola,
   registro <userData>/gmail-hora.log y búsquedas serializadas. Incluye la
   regresión completa v3.2.0 (150 pruebas). Ejecuta el CÓDIGO REAL de
   web/index.html y src/gmail-hora/.
   Ejecutar: node scripts/test_gmail_hora_321.js */""",
    """/* Pruebas v3.2.2 — REGLA +05: la hora que muestra Gmail (local de Lima,
   UTC−5) se convierte a UTC sumando 5 h al llenar «Hora Recepción (UTC)»:
   07:00 Lima → 12:00 UTC; 20:30 Lima → 01:30 UTC del día SIGUIENTE (la
   fecha del campo también avanza). El toast de confirmación ahora muestra
   la conversión completa (hora de Gmail + resultado UTC). Incluye la
   regresión completa v3.2.1 (166 pruebas). Ejecuta el CÓDIGO REAL de
   web/index.html y src/gmail-hora/.
   Ejecutar: node scripts/test_gmail_hora_322.js */""")

# 2) banner → v3.2.2
rep("T('banner v3.2.1', /CORPAC AIS\\/ARO Platform v3\\.2\\.1/.test(html), true);",
    "T('banner v3.2.2', /CORPAC AIS\\/ARO Platform v3\\.2\\.2/.test(html), true);")

# 3) parser: casos explícitos de la regla +05 (el caso del usuario incluido)
rep("""T('texto sin hora → null', HORA.parseHoraGmail('Plan de vuelo sin hora'), null);""",
    r"""T('texto sin hora → null', HORA.parseHoraGmail('Plan de vuelo sin hora'), null);
// —— v3.2.2: regla +05 explícita (Lima UTC−5 → UTC) ——
T('REGLA DEL USUARIO: «19 nov 2026, 7:00 a. m.» → 12:00 UTC', iso(HORA.parseHoraGmail('19 nov 2026, 7:00 a. m.')), '2026-11-19T12:00:00.000Z');
T('«19 nov 2026, 07:00» (24 h) → 12:00 UTC', iso(HORA.parseHoraGmail('19 nov 2026, 07:00')), '2026-11-19T12:00:00.000Z');
T('«19 nov 2026, 8:30 p. m.» → 01:30 UTC DEL DÍA SIGUIENTE', iso(HORA.parseHoraGmail('19 nov 2026, 8:30 p. m.')), '2026-11-20T01:30:00.000Z');
T('«19 nov 2026, 11:55 p. m.» → 04:55 UTC del día siguiente', iso(HORA.parseHoraGmail('19 nov 2026, 11:55 p. m.')), '2026-11-20T04:55:00.000Z');
T('«19 nov 2026, 12:05 a. m.» → 05:05 UTC del MISMO día', iso(HORA.parseHoraGmail('19 nov 2026, 12:05 a. m.')), '2026-11-19T05:05:00.000Z');
T('formato inglés «Nov 19, 2026, 7:00 AM» → null (se avisa con texto crudo)', HORA.parseHoraGmail('Nov 19, 2026, 7:00 AM'), null);""")

# 4) renderer: la conversión se MUESTRA en el toast
rep("T('hora leída pero no interpretada → toast con texto crudo', /no interpretada: «'\\+r\\.horaRecepcion/.test(html), true);",
    r"""T('hora leída pero no interpretada → toast con texto crudo', /no interpretada: «'\+r\.horaRecepcion/.test(html), true);
T('v3.2.2: toast muestra la hora de Gmail y la conversión +5 h', /\(hora Lima\) \+5 h → UTC/.test(html), true);
T('v3.2.2: gmailAplicarHora recibe el texto crudo de Gmail', /gmailAplicarHora\(ms,origen,gmailLocal\)/.test(html), true);
T('v3.2.2: la búsqueda automática pasa r.horaRecepcion al aplicar', /Gmail'\),r\.horaRecepcion\)/.test(html), true);""")

open('scripts/test_gmail_hora_322.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_322.js generado')

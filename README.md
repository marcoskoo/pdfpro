# PDF Editor Pro — CORPAC AIS/ARO SPHI

Aplicación web **single-file** (HTML/JS) para la gestión documental y operaciones AIS/ARO de CORPAC — sede Aeropuerto Internacional Jorge Chávez (SPHI). Funciona 100% en el navegador, sin backend propio: la autenticación, planes y suscripciones se gestionan vía funciones PostgreSQL (RPC) en **Supabase**.

**Producción (Vercel):** [https://pdfpro-eight.vercel.app](https://pdfpro-eight.vercel.app)

---

## Características principales

- **Gestor AIRAC (v2.3.0)**: ciclo vigente con cuenta regresiva, próximos ciclos con fecha de publicación (−42d Doc 8126) y consulta por fecha. Fechas verificadas 2024–2028.
- **Mapa de aeródromos del Perú (v2.3.0)**: 30 aeródromos con coordenadas (OpenStreetMap/Leaflet), búsqueda por OACI/IATA/nombre, popup con datos, medición de distancia/rumbo entre puntos y salto a la sede del usuario.
- **METAR gráfico (v2.3.0)**: rosa de vientos con flecha de dirección/velocidad, componentes de viento cruzado/cabeza vs rumbo de pista, visibilidad, capas de nubes (ft AGL), temperatura/punto de rocío, QNH y tiempo presente (Anexo 3/Doc 8896).
- **OCR de escaneados (v2.3.0)**: Tesseract.js (spa/eng) sobre la página actual o todo el documento, con copiar / enviar al decodificador / insertar como anotación editable.
- **Comparador de PDFs (v2.3.0)**: diff de texto por página con resaltado de añadidos/eliminados.
- **Marca de agua (v2.3.0)**: texto configurable (tamaño/opacidad/color/rotación, centrada o en mosaico), exportada como texto vectorial y persistente con el autosave.
- **Edición de texto del PDF persistente (v2.2.0)**: haz clic en cualquier párrafo con la herramienta cursor (o usa *Edit. párr.*) para reescribirlo; **doble clic** sobre una zona ya editada la vuelve a abrir. La edición se re-aplica tras zoom/rotación y **se guarda automáticamente por documento y usuario** (localStorage): al volver a cargar el mismo PDF la app ofrece restaurar la sesión completa. La exportación incrusta el texto nuevo como **texto vectorial real** (pdf-lib).

- **Editor PDF** con PDF.js: visualización, reorganización/rotación de páginas, cifrado y limpieza de metadatos
- **Herramientas AIS/ARO**: editor METAR/SPECI TAF, generador de NOTAMs (Doc 8126 OACI), calculadora de distancias declaradas (TORA/TODA/ASDA/LDA — Anexo 14), conversor de coordenadas y registro de turnos
- **Gestión de usuarios y planes**: registro, login con bloqueo temporal (5 intentos / 5 min), cambio de contraseña, planes con activación de suscripción del lado servidor
- **Panel de administración** para gestión de usuarios y sedes

## Estructura del repositorio

```
├── index.html                      ← la aplicación completa (v2.3.0)
└── supabase/
    ├── FIX_registro_pdfpro.sql     ← script maestro v6 (idempotente)
    └── PARCHE_v6_sede.sql          ← parche rápido (si ya aplicaste v3/v4/v5)
```

## Puesta en marcha

### 1. Base de datos (Supabase)

En el proyecto Supabase → **SQL Editor** → pegar y ejecutar **todo** `supabase/FIX_registro_pdfpro.sql`.

El script crea/repara las funciones RPC: `register_user`, `login_user` (con respaldo retrocompatible de la versión original), `change_password`, `activate_subscription` y `cleanup_autotest`. Es idempotente: puede re-ejecutarse sin riesgo y no toca los datos de usuarios existentes.

> Si ya aplicaste una versión anterior (v3/v4/v5) y solo necesitas reparar registro y login, ejecuta `supabase/PARCHE_v6_sede.sql` (30 segundos).

### 2. Frontend (Vercel)

Deploy estático del `index.html`. Desde la CLI:

```bash
vercel --prod
```

O desde el dashboard: New Project → Import Git Repository → Framework Preset: **Other** → Deploy.

## Historial de correcciones del backend

| Error PostgreSQL | Causa | Corregido en |
|---|---|---|
| `42702` column reference "login" is ambiguous | Parámetros OUT colisionaban con columnas no calificadas | v2 |
| `42P13` cannot change return type of existing function | `register_user` original con otros OUT params → se exige DROP previo | v3 |
| `42883` function digest(text, unknown) does not exist | pgcrypto vive en el esquema `extensions` de Supabase, oculto por `search_path = public` | v4 |
| `42703` column c.is_insertable_into does not exist | Esa columna existe en `information_schema.tables`, no en `.columns` (correcta: `is_updatable`) | v5 |
| `42703` column u.sede_code does not exist | `app_users` no tiene `sede_code`: tiene `sede_id` (FK a `sedes`). El resultado se obtiene de la variable (registro) o vía `LEFT JOIN sedes` (login) | v6 |

## Stack

- **Frontend:** HTML5 + JavaScript (single-file), PDF.js, Tesseract.js, jsPDF, OpenStreetMap/Leaflet
- **Base de datos:** Supabase (PostgreSQL 15 + RLS + funciones SECURITY DEFINER)
- **Hosting:** Vercel (estático)

## Notas de seguridad

- Las contraseñas se almacenan como hash **SHA-256** (pgcrypto) del lado servidor; los usuarios creados con el esquema anterior siguen autenticándose contra la función original respaldada (`login_user_v1_backup`)
- La activación de planes se realiza exclusivamente vía RPC `activate_subscription` (SECURITY DEFINER) — el precio y la vigencia se leen de la tabla `plans` en el servidor, nunca del navegador

## v2.3.1 — Edición de texto fiel al formato (fix formularios FPL/FAA 7233-4)

**Problema reportado:** al editar el texto de un formato de plan de vuelo en PDF, el editor agrupaba
TODA la página en un solo bloque: el rectángulo blanco tapaba el formato original (casillas, líneas,
columnas) y al aplicar quedaba solo texto plano re-fluído sin estructura.

**Causas (3 bugs):**
1. El agrupador de párrafos (`_getParaSpans` / `peFindParagraphAtClick`) solo usaba cercanía
   vertical: en formularios (texto repartido en casillas por toda la página) fusionaba toda la
   página en un bloque.
2. El texto se guardaba y dibujaba como un único bloque con re-flujo — perdía líneas, posiciones,
   tamaños y fuentes originales.
3. La capa de texto de PDF.js estaba **espejada verticalmente** (`top = vp.height - tx[5] - fh`
   con `tx[5]` ya top-down): el clic editaba el texto equivocado (el de la posición espejada).

**Fixes v2.3.1:**
- Nuevo núcleo geométrico `_paraGroupSpecs` compartido por ambos flujos (clic en texto y
  herramienta "Edit. párr."): run contiguo dentro de la línea (misma casilla) + encadenado
  vertical exigente (interlineado ≤1.75·fuente, solape de columna ≥45%, tamaño similar).
- Cada anotación `para-edit` lleva `lines:[{x,y,size}]` — mapa por línea: el render (canvas) y el
  export (pdf-lib, ambos exportadores) dibujan cada línea en su posición y tamaño originales.
  Retrocompatible con proyectos v2.2.0 guardados (render legacy sin mapa).
- Capa de texto sin espejo (renderAllPages, peFindParagraphAtClick, openParagraphEditor,
  ttsIsHeaderFooter).
- `setZoom` re-escala TODAS las anotaciones (incluido `lines`) y los snapshots undo/redo.
- Re-edición con cambio de tamaño re-escala el mapa de líneas.

**Validación:** 18/18 tests unitarios del agrupador (Node) + E2E 35/35 con un formulario
FAA 7233-4 real generado (filas 30pt, 3 columnas, celda ruta multi-línea): agrupación por celda,
lineMap fiel (posición ±3px), cuadrícula intacta tras editar, export vectorial en posición
original (x≈46, y≈682.9), zoom ×1.25 re-escala, undo/redo, re-edición en sitio y persistencia
autosave→restauración con `lines`.

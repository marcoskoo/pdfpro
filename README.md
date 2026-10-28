# PDF Editor Pro — CORPAC AIS/ARO SPHI

Aplicación web **single-file** (HTML/JS) para la gestión documental y operaciones AIS/ARO de CORPAC — sede Aeropuerto Internacional Jorge Chávez (SPHI). Funciona 100% en el navegador, sin backend propio: la autenticación, planes y suscripciones se gestionan vía funciones PostgreSQL (RPC) en **Supabase**.

**Producción (Vercel):** [https://pdfpro-eight.vercel.app](https://pdfpro-eight.vercel.app)

---

## Características principales

- **Editor PDF** con PDF.js: visualización, reorganización/rotación de páginas, cifrado y limpieza de metadatos
- **Herramientas AIS/ARO**: editor METAR/SPECI TAF, generador de NOTAMs (Doc 8126 OACI), calculadora de distancias declaradas (TORA/TODA/ASDA/LDA — Anexo 14), conversor de coordenadas y registro de turnos
- **Gestión de usuarios y planes**: registro, login con bloqueo temporal (5 intentos / 5 min), cambio de contraseña, planes con activación de suscripción del lado servidor
- **Panel de administración** para gestión de usuarios y sedes

## Estructura del repositorio

```
├── index.html                      ← la aplicación completa (v2.0.1)
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

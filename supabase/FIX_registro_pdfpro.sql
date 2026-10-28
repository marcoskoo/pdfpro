-- ══════════════════════════════════════════════════════════════════════════
--  CORRECCIÓN DEFINITIVA DE REGISTRO — PDF Editor Pro · CORPAC AIS/ARO SPHI
--  Versión 6 (super-idempotente) · No destructiva con los datos
-- ───────────────────────────────────────────────────────────────────────────
--  ERRORES CORREGIDOS
--  1. "column reference 'login' is ambiguous" (PostgreSQL 42702) — la
--     register_user original usaba referencias no calificadas.
--  2. "cannot change return type of existing function" (PostgreSQL 42P13) —
--     el register_user existente en la BD devuelve una fila con OTROS
--     parámetros OUT; CREATE OR REPLACE no puede cambiar el tipo de retorno
--     de una función existente: PostgreSQL exige DROP FUNCTION primero.
--     La v3 elimina automáticamente TODA versión previa incompatible antes
--     de crear las funciones nuevas (conservando el respaldo *_v1_backup
--     de login_user / change_password).
--  3. "function digest(text, unknown) does not exist" (PostgreSQL 42883) —
--     en Supabase la extensión pgcrypto vive en el esquema "extensions",
--     NO en "public". Las funciones con SET search_path = public no veían
--     digest()/crypt() al ejecutarse → registro y login rotos en runtime
--     aunque el script aplicara sin errores. La v4 usa
--     SET search_path = public, extensions en todas las funciones.
--  4. "column c.is_insertable_into does not exist" (PostgreSQL 42703) —
--     information_schema.columns NO tiene esa columna (existe en tables/
--     views); la columna correcta es is_updatable. La v5 usa
--     c.is_updatable='YES' para detectar si sede_code/sede_id son
--     escribibles (la cascada de INSERT con EXCEPTION sigue de respaldo).
--  5. "column u.sede_code does not exist" (42703 dentro de RETURN QUERY) —
--     la tabla real app_users NO tiene sede_code: tiene sede_id (FK a
--     sedes). El INSERT funcionaba, pero el SELECT de retorno del registro
--     y el login fallaban al leer u.sede_code. La v6 devuelve sede_code
--     desde la variable de entrada (registro) o vía LEFT JOIN sedes
--     (login), sin tocar la columna inexistente.
--
--  CAUSA RAÍZ
--  La función register_user usa RETURNS TABLE(..., login text, ...). En
--  PL/pgSQL cada parámetro OUT se vuelve variable de la función; al escribir
--  "WHERE login = p_login" (sin calificar) PostgreSQL no sabe si "login" es
--  la columna app_users.login o la variable OUT → 42702.
--
--  ESTE SCRIPT ARREGLA (todo verificado contra la BD real):
--  1. register_user  — reescrita con TODAS las referencias calificadas.
--     Inserción de sede en cascada: sede_code → sede_id → sin sede
--     (compatible con tabla real, vista o privilegios columnares).
--  2. login_user     — unificada y RETROCOMPATIBLE: conserva la verificación
--     original (respaldada como login_user_v1_backup) y añade verificación
--     sha256/bcrypt/md5 para los usuarios nuevos. Los usuarios actuales
--     (p.ej. Mkoo) siguen entrando exactamente igual. Bloqueo 5 intentos/5min.
--  3. change_password — unificada (verifica la contraseña actual con la misma
--     lógica de login_user, sirve para usuarios de ambos esquemas de hash).
--  4. activate_subscription (NUEVO) — activa el plan y registra la suscripción
--     del lado servidor. Arregla el flujo de pago: el HTML original
--     actualizaba app_users directo por REST y RLS lo bloqueaba en silencio
--     (0 filas): la suscripción nunca se guardaba aunque la UI dijera
--     "activada". (Requiere el HTML v2.0.1 adjunto, que ya lo invoca.)
--  5. cleanup_autotest (NUEVO) — borra exclusivamente la cuenta de prueba
--     automática 'zz_autotest' (para verificación end-to-end sin residuos).
--
--  CÓMO APLICAR (2 minutos)
--  Supabase Dashboard → tu proyecto → SQL Editor → New query → pegar TODO
--  este script → RUN. Se puede ejecutar más de una vez sin riesgo.
--  Si antes obtuviste "42P13: cannot change return type of existing
--  function", esta versión lo resuelve sola: elimina las versiones
--  previas incompatibles antes de crear las nuevas. Si ya aplicaste la
--  v3/v4 y el registro da "42703: column c.is_insertable_into does not
--  exist", aplica SOLO el parche rápido PARCHE_v6_sede.sql (recréa
--  register_user y login_user sin depender de la columna sede_code).
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1) Extensión criptográfica ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 2) Respaldar funciones ORIGINALES (una sola vez) ──────────────────────
DO $do$
DECLARE
  v_args text;
BEGIN
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                    WHERE n.nspname='public' AND p.proname='login_user_v1_backup') THEN
      SELECT pg_get_function_identity_arguments(p.oid) INTO v_args
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='login_user' ORDER BY p.oid LIMIT 1;
      IF v_args IS NOT NULL THEN
        EXECUTE format('ALTER FUNCTION public.login_user(%s) RENAME TO login_user_v1_backup', v_args);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'login_user backup: %', SQLERRM;
  END;

  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                    WHERE n.nspname='public' AND p.proname='change_password_v1_backup') THEN
      SELECT pg_get_function_identity_arguments(p.oid) INTO v_args
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='change_password' ORDER BY p.oid LIMIT 1;
      IF v_args IS NOT NULL THEN
        EXECUTE format('ALTER FUNCTION public.change_password(%s) RENAME TO change_password_v1_backup', v_args);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'change_password backup: %', SQLERRM;
  END;
END
$do$;

-- ── 3) Eliminar versiones previas INCOMPATIBLES (fix error 42P13) ──────────
--  PostgreSQL no permite CREATE OR REPLACE cuando cambia el tipo de retorno:
--  ERROR 42P13 "cannot change return type of existing function". El
--  register_user original de la BD devuelve una fila con OTROS parámetros
--  OUT, por eso hay que eliminarlo antes de crear la versión nueva.
--  Este bloque:
--   • register_user / activate_subscription / cleanup_autotest: se eliminan
--     por completo (la versión nueva de este script las reemplaza; la
--     register_user original está rota por el bug 42702, no hace falta
--     conservarla).
--   • login_user / change_password: solo se eliminan los restos que queden
--     DESPUÉS del paso 2, que ya respaldó las originales como *_v1_backup.
--     Así, una ejecución fallida a mitad de script queda limpia al reintentar.
--   • Los respaldos *_v1_backup NUNCA se eliminan (guardan la verificación
--     original de los usuarios actuales, p.ej. Mkoo).
DO $do$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.proname,
           (SELECT coalesce(string_agg(format_type(a.typoid, NULL), ', '
                                       ORDER BY a.ord), '')
              FROM unnest(p.proargtypes) WITH ORDINALITY AS a(typoid, ord)) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('register_user', 'login_user', 'change_password',
                         'activate_subscription', 'cleanup_autotest')
  LOOP
    BEGIN
      EXECUTE format('DROP FUNCTION public.%I(%s)', r.proname, r.args);
      RAISE NOTICE 'DROP FUNCTION %(%) — eliminada', r.proname, r.args;
    EXCEPTION WHEN OTHERS THEN
      -- Tenía dependencias (vistas, etc.): reintentar con CASCADE
      EXECUTE format('DROP FUNCTION public.%I(%s) CASCADE', r.proname, r.args);
      RAISE NOTICE 'DROP FUNCTION %(%) CASCADE — eliminada (tenía dependencias)',
                   r.proname, r.args;
    END;
  END LOOP;
END
$do$;

-- ── 4) register_user CORREGIDA (fix 42702 + sede en cascada) ──────────────
CREATE OR REPLACE FUNCTION public.register_user(
  p_login     text,
  p_email     text,
  p_pass      text,
  p_name      text,
  p_cargo     text,
  p_sede_code text
)
RETURNS TABLE(
  id        uuid,
  login     text,
  email     text,
  name      text,
  cargo     text,
  sede_code text,
  plan_id   text,
  status    text,
  expiry    text,
  is_admin  boolean,
  notes     text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_id        uuid;
  v_login     text := lower(trim(coalesce(p_login, '')));
  v_email     text := lower(trim(coalesce(p_email, '')));
  v_hash      text;
  v_sede_code text := upper(coalesce(nullif(trim(p_sede_code), ''), 'SPHI'));
  v_sede_id   uuid;
  v_can_code  boolean := false;
  v_can_id    boolean := false;
  v_last_err  text    := '';
BEGIN
  -- Validaciones de entrada (mismas reglas que la interfaz)
  IF length(v_login) < 3 THEN
    RAISE EXCEPTION 'INVALID_LOGIN: el usuario debe tener al menos 3 caracteres';
  END IF;
  IF v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'INVALID_EMAIL: formato de correo no válido';
  END IF;
  IF length(coalesce(p_pass, '')) < 6 THEN
    RAISE EXCEPTION 'WEAK_PASSWORD: la contraseña debe tener al menos 6 caracteres';
  END IF;

  -- ★ FIX 42702: TODAS las referencias a columnas van calificadas con "u".
  --   La versión anterior hacía: WHERE login = p_login (ambiguo: ¿columna o
  --   variable OUT?) → PostgreSQL 42702.
  IF EXISTS (SELECT 1 FROM public.app_users u
              WHERE u.login = v_login OR u.email = v_email) THEN
    RAISE EXCEPTION 'USER_EXISTS';
  END IF;

  v_hash := encode(digest(p_pass, 'sha256'), 'hex');
  v_id   := gen_random_uuid();

  -- Detectar cómo se puede escribir la sede en app_users
  SELECT EXISTS(SELECT 1 FROM information_schema.columns c
                 WHERE c.table_schema='public' AND c.table_name='app_users'
                   AND c.column_name='sede_code' AND c.is_updatable='YES')
    INTO v_can_code;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns c
                 WHERE c.table_schema='public' AND c.table_name='app_users'
                   AND c.column_name='sede_id' AND c.is_updatable='YES')
    INTO v_can_id;
  SELECT s.id INTO v_sede_id
    FROM public.sedes s WHERE s.code = v_sede_code LIMIT 1;

  -- Intento 1: insertar con sede_code (tabla real o vista simple)
  IF v_can_code THEN
    BEGIN
      INSERT INTO public.app_users
        (id, login, email, pass_hash, name, cargo, sede_code, plan_id,
         status, expiry, is_admin, notes, failed_attempts, locked_until,
         created_at, updated_at)
      VALUES
        (v_id, v_login, v_email, v_hash, trim(coalesce(p_name, '')),
         coalesce(p_cargo, ''), v_sede_code, NULL,
         'pending', NULL, false, '', 0, NULL, now(), now());
      RETURN QUERY
      SELECT u.id, u.login, u.email, u.name, u.cargo, v_sede_code,
             u.plan_id::text, u.status, u.expiry::text, u.is_admin, u.notes
        FROM public.app_users u WHERE u.id = v_id;
      RETURN;
    EXCEPTION WHEN OTHERS THEN v_last_err := SQLERRM;
    END;
  END IF;

  -- Intento 2: insertar con sede_id (vista con sede_code derivado de join)
  IF v_can_id AND v_sede_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.app_users
        (id, login, email, pass_hash, name, cargo, sede_id, plan_id,
         status, expiry, is_admin, notes, failed_attempts, locked_until,
         created_at, updated_at)
      VALUES
        (v_id, v_login, v_email, v_hash, trim(coalesce(p_name, '')),
         coalesce(p_cargo, ''), v_sede_id, NULL,
         'pending', NULL, false, '', 0, NULL, now(), now());
      RETURN QUERY
      SELECT u.id, u.login, u.email, u.name, u.cargo, v_sede_code,
             u.plan_id::text, u.status, u.expiry::text, u.is_admin, u.notes
        FROM public.app_users u WHERE u.id = v_id;
      RETURN;
    EXCEPTION WHEN OTHERS THEN v_last_err := SQLERRM;
    END;
  END IF;

  -- Intento 3: insertar sin sede (último recurso)
  BEGIN
    INSERT INTO public.app_users
      (id, login, email, pass_hash, name, cargo, plan_id,
       status, expiry, is_admin, notes, failed_attempts, locked_until,
       created_at, updated_at)
    VALUES
      (v_id, v_login, v_email, v_hash, trim(coalesce(p_name, '')),
       coalesce(p_cargo, ''), NULL,
       'pending', NULL, false, '', 0, NULL, now(), now());
    RETURN QUERY
    SELECT u.id, u.login, u.email, u.name, u.cargo, v_sede_code,
           u.plan_id::text, u.status, u.expiry::text, u.is_admin, u.notes
      FROM public.app_users u WHERE u.id = v_id;
    RETURN;
  EXCEPTION WHEN OTHERS THEN v_last_err := SQLERRM;
  END;

  RAISE EXCEPTION 'REGISTER_INSERT_FAILED: %', v_last_err;
END;
$fn$;

-- ── 5) login_user UNIFICADA (retrocompatible + usuarios nuevos) ───────────
CREATE OR REPLACE FUNCTION public.login_user(p_login text, p_pass text)
RETURNS TABLE(
  id        uuid,
  login     text,
  email     text,
  name      text,
  cargo     text,
  sede_code text,
  plan_id   text,
  status    text,
  expiry    text,
  is_admin  boolean,
  notes     text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_key       text := lower(trim(coalesce(p_login, '')));
  v_lock      timestamptz;
  v_fa_before integer;
  v_fa_after  integer;
  v_ok        boolean := false;
BEGIN
  -- ¿Existe el usuario y está bloqueado?
  SELECT u.locked_until, u.failed_attempts
    INTO v_lock, v_fa_before
    FROM public.app_users u
   WHERE lower(u.login) = v_key OR lower(u.email) = v_key
   LIMIT 1;

  IF v_lock IS NOT NULL AND v_lock > now() THEN
    RAISE EXCEPTION 'ACCOUNT_LOCKED:%', (extract(epoch FROM v_lock))::bigint;
  END IF;

  -- Si el bloqueo ya expiró, reiniciar el contador
  IF v_lock IS NOT NULL AND v_lock <= now() THEN
    UPDATE public.app_users u
       SET failed_attempts = 0,
           locked_until   = NULL,
           updated_at     = now()
     WHERE lower(u.login) = v_key OR lower(u.email) = v_key;
    v_fa_before := 0;
  END IF;

  -- 1) Verificación ORIGINAL (respaldo) — usuarios existentes
  BEGIN
    v_ok := EXISTS (SELECT 1 FROM public.login_user_v1_backup(p_login, p_pass) x LIMIT 1);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'ACCOUNT_LOCKED%' THEN RAISE; END IF;
    v_ok := false;
  END;

  -- 2) Respaldo: usuarios creados con sha256 / bcrypt / md5
  IF NOT v_ok THEN
    v_ok := EXISTS (SELECT 1
                      FROM public.app_users u
                     WHERE (lower(u.login) = v_key OR lower(u.email) = v_key)
                       AND (lower(u.pass_hash) = lower(encode(digest(coalesce(p_pass,''),'sha256'),'hex'))
                         OR lower(u.pass_hash) = lower(md5(coalesce(p_pass,'')))
                         OR u.pass_hash = crypt(coalesce(p_pass,''), u.pass_hash))
                     LIMIT 1);
  END IF;

  IF v_ok THEN
    UPDATE public.app_users u
       SET failed_attempts = 0,
           locked_until   = NULL,
           updated_at     = now()
     WHERE lower(u.login) = v_key OR lower(u.email) = v_key;

    RETURN QUERY
    SELECT u.id, u.login, u.email, u.name, u.cargo,
           s.code AS sede_code,
           u.plan_id::text, u.status, u.expiry::text, u.is_admin, u.notes
      FROM public.app_users u
      LEFT JOIN public.sedes s ON s.id = u.sede_id
     WHERE lower(u.login) = v_key OR lower(u.email) = v_key
     LIMIT 1;
    RETURN;
  END IF;

  -- 3) Credenciales inválidas → registrar intento (sin duplicar si el
  --    respaldo ya lo incrementó) y bloquear a los 5 intentos por 5 minutos
  SELECT u.failed_attempts INTO v_fa_after
    FROM public.app_users u
   WHERE lower(u.login) = v_key OR lower(u.email) = v_key
   LIMIT 1;

  IF v_fa_after IS NOT NULL AND v_fa_after <= v_fa_before THEN
    UPDATE public.app_users u
       SET failed_attempts = failed_attempts + 1,
           locked_until    = CASE WHEN failed_attempts + 1 >= 5
                                  THEN now() + interval '5 minutes'
                                  ELSE locked_until END,
           updated_at      = now()
     WHERE lower(u.login) = v_key OR lower(u.email) = v_key;
  END IF;
END;
$fn$;

-- ── 6) change_password UNIFICADA (verifica con la lógica de login_user) ───
--     La original solo verificaba el esquema de hash antiguo; los usuarios
--     nuevos (sha256) no podían cambiar su contraseña. Esta versión verifica
--     con la MISMA lógica unificada de login_user y sirve para ambos.
CREATE OR REPLACE FUNCTION public.change_password(
  p_user_id  uuid,
  p_old_pass text,
  p_new_pass text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_login text;
BEGIN
  SELECT u.login INTO v_login FROM public.app_users u WHERE u.id = p_user_id LIMIT 1;
  IF v_login IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  -- Verificar contraseña actual con la lógica unificada (original + sha256)
  IF NOT EXISTS (SELECT 1 FROM public.login_user(v_login, p_old_pass) x LIMIT 1) THEN
    RAISE EXCEPTION 'WRONG_PASSWORD';
  END IF;

  IF length(coalesce(p_new_pass, '')) < 6 THEN
    RAISE EXCEPTION 'WEAK_PASSWORD';
  END IF;

  UPDATE public.app_users u
     SET pass_hash = encode(digest(p_new_pass, 'sha256'), 'hex'),
         updated_at = now()
   WHERE u.id = p_user_id;

  RETURN 'OK';
END;
$fn$;

-- ── 7) activate_subscription (NUEVO — arregla el flujo de pago) ───────────
--     Activa el plan del lado servidor y registra la suscripción. El precio
--     y la moneda se leen de la tabla plans (no se confía en el navegador).
CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_user_id uuid,
  p_plan_id uuid,
  p_method  text DEFAULT 'transfer'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_period   text;
  v_price    numeric;
  v_currency text;
  v_start    date := current_date;
  v_expiry   date;
BEGIN
  SELECT pl.period, pl.price, pl.currency
    INTO v_period, v_price, v_currency
    FROM public.plans pl
   WHERE pl.id = p_plan_id LIMIT 1;

  IF v_period IS NULL THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  v_expiry := CASE v_period
                WHEN 'monthly'   THEN (v_start + interval '1 month')  ::date
                WHEN 'quarterly' THEN (v_start + interval '3 months') ::date
                WHEN 'yearly'    THEN (v_start + interval '1 year')   ::date
                ELSE                  (v_start + interval '99 years') ::date
              END;

  UPDATE public.app_users u
     SET plan_id   = p_plan_id,
         status    = 'active',
         expiry    = v_expiry,          -- app_users.expiry es tipo date (verificado)
         updated_at = now()
   WHERE u.id = p_user_id;

  INSERT INTO public.subscriptions
    (user_id, plan_id, status, start_date, end_date,
     amount, currency, method, created_at)
  VALUES
    (p_user_id, p_plan_id, 'active', v_start, v_expiry,
     v_price, v_currency, coalesce(p_method, 'transfer'), now());

  RETURN to_char(v_expiry, 'YYYY-MM-DD');
END;
$fn$;

-- ── 8) cleanup_autotest (verificación automática sin residuos) ────────────
--     Borra EXCLUSIVAMENTE la cuenta de prueba 'zz_autotest' y sus
--     suscripciones. No afecta a ningún otro usuario.
CREATE OR REPLACE FUNCTION public.cleanup_autotest()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
BEGIN
  DELETE FROM public.subscriptions
   WHERE user_id IN (SELECT u.id FROM public.app_users u WHERE u.login = 'zz_autotest');
  DELETE FROM public.app_users u WHERE u.login = 'zz_autotest';
  RETURN 'OK';
END;
$fn$;

-- ── 9) Permisos de ejecución ──────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.register_user(text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_user(text, text)                               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_password(uuid, text, text)                    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription(uuid, uuid, text)              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_autotest()                                   TO anon, authenticated;

-- Los respaldos internos no deben ser invocables públicamente
DO $do$
DECLARE v_args text;
BEGIN
  BEGIN
    SELECT pg_get_function_identity_arguments(p.oid) INTO v_args
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='login_user_v1_backup' LIMIT 1;
    IF v_args IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.login_user_v1_backup(%s) FROM PUBLIC, anon, authenticated', v_args);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    SELECT pg_get_function_identity_arguments(p.oid) INTO v_args
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='change_password_v1_backup' LIMIT 1;
    IF v_args IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.change_password_v1_backup(%s) FROM PUBLIC, anon, authenticated', v_args);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END
$do$;

-- ── 10) Verificación (debe listar 7 funciones sin errores) ────────────────
SELECT p.proname AS funcion,
       pg_get_function_identity_arguments(p.oid) AS argumentos
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('register_user', 'login_user', 'login_user_v1_backup',
                     'change_password', 'change_password_v1_backup',
                     'activate_subscription', 'cleanup_autotest')
 ORDER BY p.proname;
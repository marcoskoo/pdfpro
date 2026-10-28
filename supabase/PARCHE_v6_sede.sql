-- ══════════════════════════════════════════════════════════════════════════
--  PARCHE RÁPIDO v6 — arregla "column u.sede_code does not exist"
--  PDF Editor Pro · CORPAC AIS/ARO SPHI
-- ───────────────────────────────────────────────────────────────────────────
--  PARA QUIÉN: si ya aplicaste el PARCHE v5 (o el FIX v5) y el registro
--  falla con:
--    "REGISTER_INSERT_FAILED: column u.sede_code does not exist"
--
--  CAUSA (verificada contra la base de datos real): la tabla app_users
--  NO tiene columna sede_code — tiene sede_id (FK hacia sedes.id, y el
--  código vive en sedes.code). El INSERT del registro SÍ funcionaba, pero
--  el SELECT de retorno leía u.sede_code (columna inexistente) → error
--  42703 dentro del RETURN QUERY. Lo mismo pasaba en login_user con
--  contraseña CORRECTA (con contraseña incorrecta no fallaba porque el
--  RETURN QUERY nunca se ejecutaba).
--
--  QUÉ HACE: recrea register_user (devuelve la sede desde la variable de
--  entrada) y login_user (obtiene sede_code vía LEFT JOIN sedes).
--  change_password no se toca: se arregla solo porque llama a login_user.
--  Firmas idénticas → CREATE OR REPLACE directo, sin DROP, sin riesgo.
--  Idempotente (re-ejecutable).
--
--  CÓMO APLICAR (30 segundos): Supabase → SQL Editor → New query → pegar
--  TODO este parche → RUN. Registro y login funcionan al instante.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1) register_user (sede desde la variable, sin u.sede_code)
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

-- ── 2) login_user (sede_code vía LEFT JOIN sedes)
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

-- ── 3) Permisos (CREATE OR REPLACE los conserva; por si acaso)
GRANT EXECUTE ON FUNCTION public.register_user(text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_user(text, text)                               TO anon, authenticated;

-- ── 4) Verificación rápida: 2 filas, ambas con search_path correcto
SELECT p.proname  AS funcion,
       p.proconfig AS configuracion,
       pg_get_function_identity_arguments(p.oid) AS argumentos
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('register_user', 'login_user')
 ORDER BY p.proname;

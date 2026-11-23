-- ═══════════════════════════════════════════════════════════════════
--  PDFPro Suite v3.0.0 — Supabase: tabla del monitoreo Gmail
--  Proyecto: https://umdjydwsyodrggerepvf.supabase.co
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════
--  Registra cada correo con archivo adjunto recibido en
--  sphiaisaro@gmail.com, con su HORA DE RECEPCIÓN exacta (la que entrega
--  la API de Gmail en internalDate, en milisegundos UTC) y la lista de
--  adjuntos, para asociarla con los FPL / licencias cargados en PDFPro.

create table if not exists public.correos_gmail (
  id             bigserial primary key,
  message_id     text,                          -- id del mensaje en Gmail
  de             text,                          -- remitente (From)
  asunto         text,                          -- Subject
  recibido_ms    bigint,                        -- hora de recepción (epoch ms UTC)
  recibido_iso   timestamptz,                   -- hora de recepción (ISO 8601)
  adjuntos       jsonb default '[]'::jsonb,     -- nombres de los archivos adjuntos
  registrado_en  timestamptz default now()      -- cuándo lo guardó PDFPro
);

-- Evita duplicados si el mismo mensaje se registra dos veces
create unique index if not exists correos_gmail_message_id_uidx
  on public.correos_gmail (message_id);

-- Consulta abierta para el anon key (la app solo inserta/lee; sin borrados)
alter table public.correos_gmail enable row level security;

drop policy if exists "lectura correos gmail" on public.correos_gmail;
create policy "lectura correos gmail"
  on public.correos_gmail for select
  to anon, authenticated
  using (true);

drop policy if exists "insertar correos gmail" on public.correos_gmail;
create policy "insertar correos gmail"
  on public.correos_gmail for insert
  to anon, authenticated
  with check (true);

-- Ayuda: ver los correos registrados con la hora de recepción en hora de Lima
-- select de, asunto, adjuntos,
--        recibido_iso at time zone 'America/Lima' as recibido_lima
-- from public.correos_gmail
-- order by recibido_ms desc nulls last
-- limit 25;

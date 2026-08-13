-- Sismo 2026 — directorio de acopio, sangre, voluntariado y albergues.
--
-- Modelo de permisos: el público SOLO lee, y solo lo aprobado. Toda escritura
-- pasa por el servidor de SvelteKit con la service key, que salta RLS. Por eso
-- abajo no hay ni una policy de insert/update/delete: es intencional.

-- ── Tipos ──────────────────────────────────────────────────────────────────
create type tipo_lugar as enum ('acopio', 'sangre', 'voluntariado', 'albergue');

create type estado_operativo as enum ('necesita_gente', 'estable', 'saturado', 'cerrado');

create type estado_moderacion as enum ('pendiente', 'aprobado', 'rechazado');

create type etiqueta_necesidad as enum (
  'comida', 'agua', 'ropa', 'aseo', 'medicamentos',
  'voluntarios', 'herramientas', 'transporte'
);

create type nivel_necesidad as enum ('urgente', 'recibiendo', 'no_recibir');

create type rol_token as enum ('editor', 'veedor');

create type estado_token as enum ('activo', 'revocado');

create type motivo_reporte as enum ('ya_no_reciben', 'saturado', 'cerrado', 'direccion_mala');

-- ── Lugares ────────────────────────────────────────────────────────────────
create table lugares (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null check (char_length(nombre) between 3 and 120),
  tipo              tipo_lugar not null,
  ciudad            text not null check (char_length(ciudad) between 2 and 80),
  departamento      text not null check (char_length(departamento) between 2 and 80),
  direccion         text not null check (char_length(direccion) between 5 and 200),
  referencia        text check (char_length(referencia) <= 200),
  lat               double precision check (lat between -90 and 90),
  lng               double precision check (lng between -180 and 180),
  horario           text check (char_length(horario) <= 120),
  contacto_publico  text check (char_length(contacto_publico) <= 80),
  nota              text check (char_length(nota) <= 140),

  estado_operativo  estado_operativo not null default 'estable',
  estado_moderacion estado_moderacion not null default 'pendiente',

  -- Por qué se rechazó, para que veeduría no repita el análisis.
  nota_moderacion   text check (char_length(nota_moderacion) <= 300),

  creado_en         timestamptz not null default now(),
  -- Solo se toca cuando cambia información que le importa al público, no en
  -- acciones de moderación: es el "actualizado hace X" que ve la gente.
  actualizado_en    timestamptz not null default now()
);

create index lugares_consulta_idx
  on lugares (estado_moderacion, ciudad, tipo);

create index lugares_actualizado_idx
  on lugares (actualizado_en desc);

-- ── Necesidades ────────────────────────────────────────────────────────────
create table lugar_necesidades (
  lugar_id  uuid not null references lugares (id) on delete cascade,
  etiqueta  etiqueta_necesidad not null,
  nivel     nivel_necesidad not null,
  primary key (lugar_id, etiqueta)
);

create index lugar_necesidades_busqueda_idx
  on lugar_necesidades (etiqueta, nivel);

-- ── Tokens ─────────────────────────────────────────────────────────────────
-- Nunca se guarda el token en claro, solo su SHA-256 en hex.
create table tokens (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text not null unique,
  rol          rol_token not null default 'editor',
  -- Null hasta que quien lo recibe reclama su lugar. Un token = un lugar.
  lugar_id     uuid unique references lugares (id) on delete set null,
  -- A quién se le entregó: "Cruz Roja Chapinero, WhatsApp 300...".
  etiqueta     text not null check (char_length(etiqueta) between 2 and 160),
  canal        text check (char_length(canal) <= 40),
  estado       estado_token not null default 'activo',
  creado_en    timestamptz not null default now(),
  usado_en     timestamptz
);

create index tokens_lugar_idx on tokens (lugar_id);

-- ── Auditoría ──────────────────────────────────────────────────────────────
create table ediciones (
  id         bigserial primary key,
  lugar_id   uuid references lugares (id) on delete set null,
  token_id   uuid references tokens (id) on delete set null,
  accion     text not null,
  diff       jsonb,
  creado_en  timestamptz not null default now()
);

create index ediciones_lugar_idx on ediciones (lugar_id, creado_en desc);

-- ── Reportes del público ───────────────────────────────────────────────────
-- Única vía de escritura del público, y va por el servidor igual. Sin texto
-- libre a propósito: motivo de lista cerrada, superficie de spam mínima.
create table reportes (
  id         bigserial primary key,
  lugar_id   uuid not null references lugares (id) on delete cascade,
  motivo     motivo_reporte not null,
  ip_hash    text not null,
  atendido   boolean not null default false,
  creado_en  timestamptz not null default now()
);

create index reportes_lugar_idx on reportes (lugar_id, atendido, creado_en desc);
create index reportes_rate_limit_idx on reportes (ip_hash, creado_en desc);

-- ── Distancia, para detectar duplicados en veeduría ────────────────────────
-- Haversine a mano para no depender de postgis ni earthdistance.
create or replace function distancia_metros(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable parallel safe as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table lugares           enable row level security;
alter table lugar_necesidades enable row level security;
alter table tokens            enable row level security;
alter table ediciones         enable row level security;
alter table reportes          enable row level security;

-- Lo único que la anon key puede hacer en toda la base: leer lo aprobado.
create policy "lectura pública de lugares aprobados"
  on lugares for select
  to anon, authenticated
  using (estado_moderacion = 'aprobado');

create policy "lectura pública de necesidades de lugares aprobados"
  on lugar_necesidades for select
  to anon, authenticated
  using (
    exists (
      select 1 from lugares l
      where l.id = lugar_necesidades.lugar_id
        and l.estado_moderacion = 'aprobado'
    )
  );

-- tokens, ediciones y reportes quedan con RLS activo y sin ninguna policy:
-- inalcanzables con la anon key, en select y en escritura.

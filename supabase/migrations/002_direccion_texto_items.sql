-- Sismo 2026 — dirección detallada, texto libre y lista de ítems por lugar.
--
-- Tres cosas que pidió el campo y que la 001 no cubría:
--   1. La dirección de un acopio rara vez es solo "Cra 30 # 57-40": es un
--      conjunto, una torre, un salón parroquial. Se guarda descompuesta y en
--      campos propios, no como texto pegado a lo que devuelva un geocodificador.
--   2. Un párrafo libre que el responsable escribe y actualiza a su aire.
--   3. Una lista de ítems concretos ("pañales talla 2", "acetaminofén"), cada
--      uno colgado de una categoría para que el filtro público los alcance.

-- ── Dirección detallada ────────────────────────────────────────────────────
-- Todo opcional: en una emergencia se registra con lo que se tenga a mano y
-- se completa después.
alter table lugares
  add column barrio       text check (char_length(barrio) <= 80),
  add column edificio     text check (char_length(edificio) <= 80),
  add column torre        text check (char_length(torre) <= 30),
  add column piso         text check (char_length(piso) <= 20),
  add column apartamento  text check (char_length(apartamento) <= 30);

comment on column lugares.edificio is
  'Nombre del conjunto, edificio, parroquia o sede. Independiente del geocodificador.';

-- ── Texto libre ────────────────────────────────────────────────────────────
-- 2000 caracteres: cabe un comunicado corto y no una novela. Se muestra tal
-- cual, sin interpretar marcado, así que no hay superficie de inyección.
alter table lugares
  add column texto_libre text check (char_length(texto_libre) <= 2000);

-- ── Ítems concretos ────────────────────────────────────────────────────────
-- `categoria` puede quedar en null si la heurística no adivinó y quien escribe
-- no la corrigió: el ítem se sigue mostrando, solo que no entra en los filtros.
create table lugar_items (
  id         bigserial primary key,
  lugar_id   uuid not null references lugares (id) on delete cascade,
  texto      text not null check (char_length(texto) between 1 and 80),
  categoria  etiqueta_necesidad,
  nivel      nivel_necesidad not null default 'recibiendo',
  -- Lo decide quien escribe arrastrando la lista; empata por id.
  orden      integer not null default 0,
  creado_en  timestamptz not null default now()
);

create index lugar_items_lugar_idx on lugar_items (lugar_id, orden, id);
create index lugar_items_categoria_idx on lugar_items (categoria, nivel);

alter table lugar_items enable row level security;

-- Mismo criterio que el resto: la anon key solo lee lo aprobado.
create policy "lectura pública de ítems de lugares aprobados"
  on lugar_items for select
  to anon, authenticated
  using (
    exists (
      select 1 from lugares l
      where l.id = lugar_items.lugar_id
        and l.estado_moderacion = 'aprobado'
    )
  );

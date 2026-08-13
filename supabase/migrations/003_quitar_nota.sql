-- Sismo 2026 — se elimina `lugares.nota`.
--
-- Nació como "nota corta para la tarjeta", pero terminó compitiendo con
-- `texto_libre`: quien registra tiene que decidir qué va en 140 caracteres y
-- qué en el párrafo largo, y esa decisión no le importa a nadie más. En la
-- práctica se llenaban las dos con lo mismo, o se llenaba la nota y quedaba
-- vacío el texto libre, que es el que el responsable sí puede editar a diario
-- sin pasar por moderación.
--
-- Queda un solo campo de texto del lugar, `texto_libre`. Lo que ya estaba
-- escrito en `nota` se conserva pegándolo al principio del párrafo, para no
-- perder información de campo que alguien se tomó el trabajo de reportar.

-- `left(..., 2000)` porque los dos campos juntos pueden pasarse del tope de
-- `texto_libre` y reventar su propio check.
update lugares
   set texto_libre = left(
         case
           when texto_libre is null or btrim(texto_libre) = '' then nota
           else nota || e'\n\n' || texto_libre
         end,
         2000
       )
 where nota is not null
   and btrim(nota) <> '';

alter table lugares drop column nota;

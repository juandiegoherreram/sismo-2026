# Sismo 2026 — Directorio de acopio y ayuda

Directorio público de centros de acopio, donación de sangre, voluntariado y albergues,
con el **estado en vivo** de cada punto.

El problema que resuelve: en una emergencia la gente se autoconvoca al mismo sitio, lo
satura, y a diez cuadras hay un punto sin quién descargue. Acá cada punto puede decir
"necesitamos gente" o "estamos saturados, vayan a otro lado", y la lista pública ordena
por eso: los saturados caen al fondo.

## Cómo está pensado

**Es una app de consulta, no de escritura.** Si la autoría es abierta, la base se llena de
duplicados y datos falsos en horas. Entonces:

- El público **solo lee**, y solo lo aprobado.
- Escribe únicamente quien recibió un **token**, entregado a mano por WhatsApp/Instagram
  tras hablar con el responsable real del sitio.
- **Un token = un lugar.** No se puede registrar un segundo.
- Encima va **veeduría manual**: nada aparece en público sin aprobación.
- El público tiene una sola válvula: reportar que algo está desactualizado, con motivos de
  lista cerrada y sin texto libre.

El token es una *capability key*: en la base solo vive su SHA-256, y quien tiene el link
edita su lugar sin contraseñas ni recuperación de cuenta a las 3 de la mañana.

## El link mágico

Abrir el link **es** iniciar sesión. `hooks.server.ts` intercepta el `?k=…`, lo valida, lo
guarda en una cookie `httpOnly` de 30 días y redirige a la misma ruta ya sin el token.

Sacarlo de la URL cuanto antes importa: mientras vive ahí queda en el historial, en el
`Referer` de cualquier link saliente y en la captura de pantalla que la gente manda por
WhatsApp para pedir ayuda. El link original sigue sirviendo cuantas veces lo abran, que es
como se usa en la práctica: guardado en un chat.

Si la cookie se pierde —celular nuevo, navegador limpiado, link que llegó sin ser
clickeable— `/entrar` deja pegar el link completo o dictar solo el código. `/salir` cierra
la sesión en ese dispositivo sin revocar nada.

## Primera vez vs. modo edición

`/mi-lugar` es una sola ruta con dos caras, según el token tenga lugar o no:

- **Sin lugar** → pantalla de setup: se registra el centro y se acabó el asistente.
- **Con lugar** → panel: estado operativo de un toque, la lista de lo que necesitan hoy, y
  los datos del lugar detrás de un «Editar».

## Qué necesitan, en dos niveles

- **Categorías** (agua, comida, medicamentos…) — lista cerrada, es lo que alimenta los
  filtros y el mapa.
- **Ítems escritos a mano** ("pañales talla 2", "acetaminofén") — cada uno se clasifica
  solo con la heurística de [src/lib/categorizar.ts](src/lib/categorizar.ts), y quien
  escribe puede corregir la categoría. Así un ítem suelto también entra en los filtros.
- **Texto libre**, hasta 2000 caracteres, sin marcado ni links: se muestra tal cual, con
  los saltos de línea respetados. Lo actualiza el centro sin pasar por moderación.

## Direcciones

La dirección se guarda descompuesta y en campos propios —barrio, edificio, torre, piso,
apto— porque un acopio en la torre B de un conjunto no lo encuentra ningún geocodificador,
y sin eso la gente llega a la portería y no sabe para dónde coger.

El buscador de direcciones va contra Photon (OpenStreetMap) **desde el servidor**
(`/api/geo`, detrás de sesión): así la IP de cada persona no se le entrega a un tercero y
el límite de peticiones se controla en un punto. Si el servicio se cae, el mapa sigue
sirviendo a punta de toque — buscar es una comodidad, nunca un requisito.

## Arranque

```bash
npm install
cp .env.example .env      # y complete las credenciales de Supabase
npm run dev
```

### Supabase

1. Cree un proyecto y corra las migraciones de `supabase/migrations/` **en orden** desde el
   SQL editor, o con el CLI:

   ```bash
   npx supabase db push --db-url '<url del pooler>'
   ```
2. Opcional, para probar con datos:

   ```bash
   node scripts/sembrar.mjs "Su nombre"   # ejemplos + su acceso de veeduría
   node scripts/sembrar.mjs --limpiar     # los borra
   ```

   Va por la service key en vez del pooler, así que no pide la contraseña de la
   base. El equivalente en SQL está en `supabase/seed.sql`.
3. Copie a `.env` la URL, la `anon key` y la `service_role key`.

### Primer acceso de veeduría

Los tokens se generan desde `/veeduria/personas`, así que el primero se crea a mano:

```bash
node scripts/token-veedor.mjs "Su nombre"
```

Imprime el link y el `INSERT` para pegar en Supabase. Guarde el link: no se vuelve a mostrar.

### WhatsApp (opcional)

Con `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_ACCESS_TOKEN` de la Cloud API de Meta, la
veeduría puede mandar el acceso directo al responsable. Sin eso todo funciona igual: queda
el botón de "copiar mensaje" para pegarlo a mano.

## Rutas

| Ruta | Quién | Para qué |
|---|---|---|
| `/` | público | Lista filtrable por ciudad, tipo y necesidad |
| `/mapa` | público | Los mismos datos y filtros sobre Leaflet + OpenStreetMap |
| `/lugar/[id]` | público | Detalle, cómo llegar, reportar desactualizado |
| `/registrar` | público | Cómo pedir un acceso |
| `/entrar` | público | Pegar el link o el código cuando la sesión se perdió |
| `/mi-lugar` | con sesión | Setup la primera vez; después, panel del centro |
| `/veeduria` | veeduría | Moderar la cola y ver los reportes del público |
| `/veeduria/personas` | veeduría | Generar links, ver quién tiene qué lugar, revocar |

Los filtros viven en la URL, así que un link de WhatsApp puede llevar "acopios en Bogotá
que necesitan agua" ya aplicado.

## Deploy

Netlify con `adapter-netlify`. Además de las de Supabase, configure `PUBLIC_SITE_URL` con
el dominio real: de ahí salen los links de invitación.

## Pendiente antes de publicar

- Poner el contacto real del equipo en [src/routes/registrar/+page.svelte](src/routes/registrar/+page.svelte).
- Revocar cualquier token de prueba.

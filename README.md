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

## Arranque

```bash
npm install
cp .env.example .env      # y complete las credenciales de Supabase
npm run dev
```

### Supabase

1. Cree un proyecto y corra `supabase/migrations/001_initial_schema.sql` en el SQL editor.
2. Opcional, para probar con datos: corra `supabase/seed.sql`.
3. Copie a `.env` la URL, la `anon key` y la `service_role key`.

### Primer acceso de veeduría

Los tokens se generan desde `/veeduria`, así que el primero se crea a mano:

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
| `/mi-lugar?k=…` | con token | Cambiar estado de un toque y editar los datos |
| `/veeduria?k=…` | veeduría | Moderar, generar y revocar accesos, ver reportes |

Los filtros viven en la URL, así que un link de WhatsApp puede llevar "acopios en Bogotá
que necesitan agua" ya aplicado.

## Deploy

Netlify con `adapter-netlify`. Además de las de Supabase, configure `PUBLIC_SITE_URL` con
el dominio real: de ahí salen los links de invitación.

## Pendiente antes de publicar

- Poner el contacto real del equipo en [src/routes/registrar/+page.svelte](src/routes/registrar/+page.svelte).
- Revocar cualquier token de prueba.

#!/usr/bin/env node
// Genera el primer acceso de veeduría. Se necesita una sola vez: de ahí en
// adelante los accesos se crean desde /veeduria.
//
//   node scripts/token-veedor.mjs "Mamanche"

import { createHash, randomBytes } from 'node:crypto';

// Mismo alfabeto que generarToken() en src/lib/server/auth.ts: sin vocales, así
// no se forman palabras y se puede dictar por teléfono sin ambigüedad.
const ALFABETO = '0123456789BCDFGHJKLMNPQRSTVWXZ';

const token = [...randomBytes(20)].map((b) => ALFABETO[b % ALFABETO.length]).join('');
const hash = createHash('sha256').update(token).digest('hex');
const etiqueta = (process.argv[2] ?? 'Veeduría inicial').replace(/'/g, "''");

console.log(`
Su link de veeduría (guárdelo, no se vuelve a mostrar):

  http://localhost:5173/veeduria?k=${token}

Pegue esto en el SQL editor de Supabase:

insert into tokens (token_hash, rol, etiqueta, canal)
values ('${hash}', 'veedor', '${etiqueta}', 'manual');
`);

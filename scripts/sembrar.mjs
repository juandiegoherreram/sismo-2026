#!/usr/bin/env node
// Siembra la base con los datos de ejemplo y un acceso de veeduría.
//
//   node scripts/sembrar.mjs "Su nombre"      siembra ejemplos + acceso de veeduría
//   node scripts/sembrar.mjs --solo-token "X" solo el acceso, sin tocar los lugares
//   node scripts/sembrar.mjs --limpiar        borra los lugares de ejemplo
//
// Va por la service key en vez de por SQL directo porque el pooler pide una
// contraseña que no está en .env, y esto solo toca tablas normales.
//
// NO correr contra una base con datos reales: `--limpiar` borra por nombre,
// pero sembrar encima de lugares de verdad deja basura mezclada.

import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
	readFileSync(new URL('../.env', import.meta.url), 'utf8')
		.split('\n')
		.filter((l) => l.includes('=') && !l.trim().startsWith('#'))
		.map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
	auth: { persistSession: false }
});

const LUGARES = [
	{
		nombre: 'Acopio Estadio El Campín',
		tipo: 'acopio', ciudad: 'Bogotá', departamento: 'Cundinamarca',
		direccion: 'Cra 30 # 57-60', barrio: 'Nicolás de Federmán',
		edificio: 'Estadio El Campín', referencia: 'Portería norte, junto a las taquillas',
		lat: 4.6457, lng: -74.0776, horario: '7am a 8pm', contacto_publico: '3001234567',
		texto_libre:
			'Estamos recibiendo de 7am a 8pm, sin cerrar a mediodía.\n\n' +
			'Lo que más falta hoy es agua. Si puede, tráigala en bolsa o botella sellada.\n\n' +
			'No estamos recibiendo ropa usada: no tenemos dónde clasificarla.',
		estado_operativo: 'necesita_gente', estado_moderacion: 'aprobado',
		necesidades: [
			{ etiqueta: 'agua', nivel: 'urgente' },
			{ etiqueta: 'ropa', nivel: 'no_recibir' },
			{ etiqueta: 'comida', nivel: 'recibiendo' }
		],
		items: [
			{ texto: 'Agua en bolsa', nivel: 'urgente' },
			{ texto: 'Pañales talla 2 y 3', nivel: 'urgente' },
			{ texto: 'Atún y enlatados', nivel: 'recibiendo' },
			{ texto: 'Ropa usada', nivel: 'no_recibir' }
		]
	},
	{
		nombre: 'Movistar Arena — Punto de recepción',
		tipo: 'acopio', ciudad: 'Bogotá', departamento: 'Cundinamarca',
		direccion: 'Diagonal 61C # 26-36', barrio: 'La Esmeralda',
		referencia: 'Entrada de servicio, costado oriental',
		lat: 4.6491, lng: -74.0768, horario: '8am a 6pm',
		texto_libre: 'Ya tenemos suficiente ropa y comida no perecedera. Mejor vayan a otros puntos.',
		estado_operativo: 'saturado', estado_moderacion: 'aprobado',
		necesidades: [
			{ etiqueta: 'ropa', nivel: 'no_recibir' },
			{ etiqueta: 'comida', nivel: 'no_recibir' }
		],
		items: []
	},
	{
		nombre: 'Banco de Sangre Cruz Roja',
		tipo: 'sangre', ciudad: 'Bogotá', departamento: 'Cundinamarca',
		direccion: 'Av. Carrera 68 # 68B-31', barrio: 'Normandía',
		edificio: 'Sede nacional Cruz Roja', piso: '2',
		lat: 4.6588, lng: -74.0921, horario: '7am a 7pm', contacto_publico: '3109876543',
		texto_libre: 'Se necesitan donantes O- y O+. Venga desayunado e hidratado.',
		estado_operativo: 'necesita_gente', estado_moderacion: 'aprobado',
		necesidades: [{ etiqueta: 'voluntarios', nivel: 'urgente' }],
		items: []
	},
	{
		nombre: 'Brigada de voluntarios Suba',
		tipo: 'voluntariado', ciudad: 'Bogotá', departamento: 'Cundinamarca',
		direccion: 'Calle 145 # 91-19', barrio: 'Suba Centro',
		referencia: 'Frente al parque principal',
		lat: 4.7443, lng: -74.0836, horario: '6am a 6pm',
		texto_libre: 'Buscamos gente con experiencia en primeros auxilios y palas.',
		estado_operativo: 'necesita_gente', estado_moderacion: 'aprobado',
		necesidades: [
			{ etiqueta: 'voluntarios', nivel: 'urgente' },
			{ etiqueta: 'herramientas', nivel: 'urgente' }
		],
		items: [
			{ texto: 'Palas y carretillas', nivel: 'urgente' },
			{ texto: 'Gente con primeros auxilios', nivel: 'urgente' },
			{ texto: 'Linternas con pilas', nivel: 'recibiendo' }
		]
	},
	{
		nombre: 'Albergue temporal Colegio San Pedro',
		tipo: 'albergue', ciudad: 'Villavicencio', departamento: 'Meta',
		direccion: 'Calle 15 # 22-40', barrio: 'El Barzal',
		edificio: 'Colegio San Pedro', torre: 'Bloque B', piso: '1',
		referencia: 'Coliseo del colegio',
		lat: 4.142, lng: -73.6266, horario: 'Abierto 24 horas', contacto_publico: '3205551212',
		texto_libre:
			'Tenemos 40 cupos y quedan 12.\n\n' +
			'Si va a traer donaciones, entre por el coliseo, no por la portería principal.',
		estado_operativo: 'necesita_gente', estado_moderacion: 'aprobado',
		necesidades: [
			{ etiqueta: 'aseo', nivel: 'urgente' },
			{ etiqueta: 'medicamentos', nivel: 'recibiendo' }
		],
		items: [
			{ texto: 'Colchonetas', nivel: 'urgente' },
			{ texto: 'Cobijas', nivel: 'urgente' },
			{ texto: 'Acetaminofén', nivel: 'recibiendo' }
		]
	},
	{
		nombre: 'Acopio Parroquia Santa Ana',
		tipo: 'acopio', ciudad: 'Villavicencio', departamento: 'Meta',
		direccion: 'Cra 40 # 26-15', edificio: 'Parroquia Santa Ana',
		lat: 4.137, lng: -73.635, horario: '8am a 5pm',
		estado_operativo: 'estable', estado_moderacion: 'aprobado',
		necesidades: [], items: []
	},
	{
		nombre: 'Punto ciudadano sin verificar',
		tipo: 'acopio', ciudad: 'Bogotá', departamento: 'Cundinamarca',
		direccion: 'Calle 100 # 15-20',
		texto_libre: 'Entrada de prueba para ver la cola de moderación.',
		estado_operativo: 'estable', estado_moderacion: 'pendiente',
		necesidades: [], items: []
	}
];

const NOMBRES = LUGARES.map((l) => l.nombre);

async function limpiar() {
	const { error } = await db.from('lugares').delete().in('nombre', NOMBRES);
	if (error) throw error;
	console.log(`Borrados los ${NOMBRES.length} lugares de ejemplo (con sus ítems y necesidades).`);
}

async function sembrar() {
	// La categoría de cada ítem la pone la misma heurística que usa la app: si
	// se cambia categorizar.ts, sembrar de nuevo refleja el cambio.
	const { adivinarCategoria } = await import('../src/lib/categorizar.ts');

	for (const { necesidades, items, ...lugar } of LUGARES) {
		const { data, error } = await db.from('lugares').insert(lugar).select('id').single();
		if (error) throw error;

		if (necesidades.length) {
			const { error: e } = await db
				.from('lugar_necesidades')
				.insert(necesidades.map((n) => ({ lugar_id: data.id, ...n })));
			if (e) throw e;
		}

		if (items.length) {
			const { error: e } = await db.from('lugar_items').insert(
				items.map((item, i) => ({
					lugar_id: data.id,
					orden: i,
					categoria: adivinarCategoria(item.texto),
					...item
				}))
			);
			if (e) throw e;
		}

		console.log(`  ✓ ${lugar.nombre}`);
	}
}

async function crearVeedor() {
	const ALFABETO = '0123456789BCDFGHJKLMNPQRSTVWXZ';
	const token = [...randomBytes(20)].map((b) => ALFABETO[b % ALFABETO.length]).join('');
	const hash = createHash('sha256').update(token).digest('hex');

	const { error } = await db.from('tokens').insert({
		token_hash: hash,
		rol: 'veedor',
		// El nombre es el primer argumento que no sea una bandera.
		etiqueta: process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'Veeduría inicial',
		canal: 'manual'
	});
	if (error) throw error;

	return token;
}

if (process.argv.includes('--limpiar')) {
	await limpiar();
} else {
	// `--solo-token` sirve para rotar el acceso de veeduría sin volver a
	// sembrar, y para crear el primero cuando la base ya tiene datos reales.
	if (!process.argv.includes('--solo-token')) {
		console.log('Sembrando lugares de ejemplo…');
		await sembrar();
	}

	const token = await crearVeedor();
	const base = env.PUBLIC_SITE_URL || 'http://localhost:5173';
	console.log(`
Acceso de veeduría (guárdelo, no se vuelve a mostrar):

  ${base}/veeduria?k=${token}
  local: http://localhost:5173/veeduria?k=${token}
`);
}

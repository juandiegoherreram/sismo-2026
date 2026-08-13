import type { LugarConNecesidades } from './types';

/** Dos entradas a menos de esto casi siempre son el mismo sitio. */
const METROS_DUPLICADO = 150;

type Ubicable = Pick<LugarConNecesidades, 'id' | 'nombre' | 'lat' | 'lng'>;

export interface Duplicado {
	id: string;
	nombre: string;
	razon: string;
}

function normalizar(texto: string): string {
	return texto
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9 ]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function metrosEntre(a: Ubicable, b: Ubicable): number | null {
	if (a.lat === null || a.lng === null || b.lat === null || b.lng === null) return null;
	const rad = Math.PI / 180;
	const dLat = (b.lat - a.lat) * rad;
	const dLng = (b.lng - a.lng) * rad;
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
	return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/**
 * Marca posibles duplicados por nombre normalizado o por cercanía física. No
 * decide nada: solo le ahorra a quien modera el trabajo de cruzar la lista a ojo.
 */
export function detectarDuplicados(lugares: Ubicable[]): Map<string, Duplicado[]> {
	const mapa = new Map<string, Duplicado[]>();

	for (let i = 0; i < lugares.length; i++) {
		for (let j = i + 1; j < lugares.length; j++) {
			const a = lugares[i];
			const b = lugares[j];

			const mismoNombre = normalizar(a.nombre) === normalizar(b.nombre);
			const distancia = metrosEntre(a, b);
			const cerca = distancia !== null && distancia < METROS_DUPLICADO;
			if (!mismoNombre && !cerca) continue;

			const razon = mismoNombre ? 'mismo nombre' : `a ${Math.round(distancia!)} m`;
			for (const [uno, otro] of [
				[a, b],
				[b, a]
			] as const) {
				const lista = mapa.get(uno.id) ?? [];
				lista.push({ id: otro.id, nombre: otro.nombre, razon });
				mapa.set(uno.id, lista);
			}
		}
	}

	return mapa;
}

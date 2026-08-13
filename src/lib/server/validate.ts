import { error } from '@sveltejs/kit';
import { adivinarCategoria } from '$lib/categorizar';
import type {
	EstadoOperativo,
	EtiquetaNecesidad,
	ItemNuevo,
	MotivoReporte,
	Necesidad,
	NivelNecesidad,
	TipoLugar
} from '$lib/types';

/** Tope de ítems por lugar: una lista más larga ya nadie la lee en el celular. */
export const MAX_ITEMS = 40;

const TIPOS: TipoLugar[] = ['acopio', 'sangre', 'voluntariado', 'albergue'];
const ESTADOS: EstadoOperativo[] = ['necesita_gente', 'estable', 'saturado', 'cerrado'];
const ETIQUETAS: EtiquetaNecesidad[] = [
	'comida', 'agua', 'ropa', 'aseo', 'medicamentos', 'voluntarios', 'herramientas', 'transporte'
];
const NIVELES: NivelNecesidad[] = ['urgente', 'recibiendo', 'no_recibir'];
const MOTIVOS: MotivoReporte[] = ['ya_no_reciben', 'saturado', 'cerrado', 'direccion_mala'];

export function validateText(value: unknown, field: string, maxLength = 200, minLength = 1): string {
	if (typeof value !== 'string') throw error(400, `${field} debe ser texto`);
	const limpio = value.trim();
	if (limpio.length < minLength) throw error(400, `${field} no puede estar vacío`);
	if (limpio.length > maxLength) throw error(400, `${field} no puede superar ${maxLength} caracteres`);
	return limpio;
}

export function validateOptionalText(value: unknown, maxLength = 200): string | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value !== 'string') throw error(400, 'Formato de texto inválido');
	const limpio = value.trim();
	if (!limpio) return null;
	if (limpio.length > maxLength) throw error(400, `No puede superar ${maxLength} caracteres`);
	return limpio;
}

export function validateTipo(value: unknown): TipoLugar {
	if (!TIPOS.includes(value as TipoLugar)) throw error(400, 'Tipo de lugar inválido');
	return value as TipoLugar;
}

export function validateEstadoOperativo(value: unknown): EstadoOperativo {
	if (!ESTADOS.includes(value as EstadoOperativo)) throw error(400, 'Estado inválido');
	return value as EstadoOperativo;
}

export function validateMotivo(value: unknown): MotivoReporte {
	if (!MOTIVOS.includes(value as MotivoReporte)) throw error(400, 'Motivo inválido');
	return value as MotivoReporte;
}

/** Coordenada opcional: o vienen las dos o no viene ninguna. */
export function validateCoordenadas(lat: unknown, lng: unknown): { lat: number | null; lng: number | null } {
	const vacio = (v: unknown) => v === null || v === undefined || v === '';
	if (vacio(lat) && vacio(lng)) return { lat: null, lng: null };
	if (vacio(lat) || vacio(lng)) throw error(400, 'Faltó una de las dos coordenadas');

	const nLat = Number(lat);
	const nLng = Number(lng);
	if (!Number.isFinite(nLat) || nLat < -90 || nLat > 90) throw error(400, 'Latitud inválida');
	if (!Number.isFinite(nLng) || nLng < -180 || nLng > 180) throw error(400, 'Longitud inválida');
	return { lat: nLat, lng: nLng };
}

/**
 * Lista de ítems escritos a mano. La categoría es opcional: si no viene, se
 * adivina acá y no en el navegador, para que un cliente viejo o una llamada
 * directa a la API produzcan exactamente lo mismo que el formulario.
 */
export function validateItems(value: unknown): ItemNuevo[] {
	if (value === null || value === undefined) return [];
	if (!Array.isArray(value)) throw error(400, 'La lista de ítems es inválida');
	if (value.length > MAX_ITEMS) throw error(400, `No puede pasar de ${MAX_ITEMS} ítems`);

	const items: ItemNuevo[] = [];
	const vistos = new Set<string>();

	for (const crudo of value) {
		const texto = validateOptionalText((crudo as ItemNuevo)?.texto, 80);
		if (!texto) continue; // Renglón vacío del formulario: se ignora, no es un error.

		// Dos veces "agua" en la misma lista es un descuido, no una intención.
		const clave = texto.toLowerCase();
		if (vistos.has(clave)) continue;
		vistos.add(clave);

		const cruda = (crudo as ItemNuevo)?.categoria;
		const categoria =
			cruda === null || cruda === undefined || cruda === ('' as unknown)
				? adivinarCategoria(texto)
				: ETIQUETAS.includes(cruda)
					? cruda
					: throwCategoriaInvalida();

		const nivel = (crudo as ItemNuevo)?.nivel;
		items.push({
			texto,
			categoria,
			nivel: NIVELES.includes(nivel) ? nivel : 'recibiendo'
		});
	}

	return items;
}

function throwCategoriaInvalida(): never {
	throw error(400, 'Categoría de ítem inválida');
}

/** Descarta duplicados de etiqueta para no violar la PK de lugar_necesidades. */
export function validateNecesidades(value: unknown): Necesidad[] {
	if (value === null || value === undefined) return [];
	if (!Array.isArray(value)) throw error(400, 'Las necesidades deben ser una lista');
	if (value.length > ETIQUETAS.length) throw error(400, 'Demasiadas necesidades');

	const porEtiqueta = new Map<EtiquetaNecesidad, Necesidad>();
	for (const item of value) {
		const etiqueta = (item as Necesidad)?.etiqueta;
		const nivel = (item as Necesidad)?.nivel;
		if (!ETIQUETAS.includes(etiqueta)) throw error(400, 'Necesidad inválida');
		if (!NIVELES.includes(nivel)) throw error(400, 'Nivel de necesidad inválido');
		porEtiqueta.set(etiqueta, { etiqueta, nivel });
	}
	return [...porEtiqueta.values()];
}

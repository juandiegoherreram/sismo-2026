import { error } from '@sveltejs/kit';
import { supabase } from './supabase';
import type { EstadoOperativo, Filtros, LugarConNecesidades, Necesidad } from '$lib/types';
import { ESTADOS_OPERATIVOS } from '$lib/constantes';

/**
 * Nunca mostrar una lista vacía cuando la base falla: alguien podría concluir
 * que no hay dónde ayudar. Se cae con un mensaje explícito y el detalle técnico
 * queda solo en los logs.
 */
function caer(contexto: string, detalle: unknown): never {
	console.error(`[lugares] ${contexto}:`, detalle);
	throw error(503, 'No pudimos cargar la información en este momento. Intente de nuevo en un minuto.');
}

const ORDEN_ESTADO = new Map<EstadoOperativo, number>(
	ESTADOS_OPERATIVOS.map((e) => [e.valor, e.orden])
);

const CAMPOS = `
  id, nombre, tipo, ciudad, departamento, direccion, referencia, lat, lng,
  horario, contacto_publico, nota, estado_operativo, estado_moderacion,
  nota_moderacion, creado_en, actualizado_en,
  lugar_necesidades ( etiqueta, nivel )
`;

type FilaCruda = Omit<LugarConNecesidades, 'necesidades'> & {
	lugar_necesidades: Necesidad[] | null;
};

function normalizar(fila: FilaCruda): LugarConNecesidades {
	const { lugar_necesidades, ...resto } = fila;
	return { ...resto, necesidades: lugar_necesidades ?? [] };
}

/**
 * Ordena por urgencia, no por fecha: primero quien necesita gente, y los
 * saturados al fondo. Es la regla que hace que la app empuje a la gente hacia
 * donde sí hacen falta en vez de amontonarla donde ya no cabe.
 */
function ordenar(a: LugarConNecesidades, b: LugarConNecesidades): number {
	const porEstado = (ORDEN_ESTADO.get(a.estado_operativo) ?? 9) - (ORDEN_ESTADO.get(b.estado_operativo) ?? 9);
	if (porEstado !== 0) return porEstado;

	const urgentes = (l: LugarConNecesidades) => l.necesidades.filter((n) => n.nivel === 'urgente').length;
	const porUrgencia = urgentes(b) - urgentes(a);
	if (porUrgencia !== 0) return porUrgencia;

	return Date.parse(b.actualizado_en) - Date.parse(a.actualizado_en);
}

export async function listarAprobados(filtros: Filtros): Promise<LugarConNecesidades[]> {
	let query = supabase.from('lugares').select(CAMPOS).eq('estado_moderacion', 'aprobado');

	if (filtros.ciudad) query = query.eq('ciudad', filtros.ciudad);
	if (filtros.tipo) query = query.eq('tipo', filtros.tipo);
	if (filtros.q) {
		const escapado = filtros.q.replace(/[%,()]/g, ' ').trim();
		if (escapado) {
			query = query.or(
				`nombre.ilike.%${escapado}%,direccion.ilike.%${escapado}%,referencia.ilike.%${escapado}%`
			);
		}
	}

	// supabase-js no lanza: los fallos de red también llegan acá dentro de `err`.
	const { data, error: err } = await query;
	if (err) caer('listar', err);

	let lugares = (data as FilaCruda[] | null)?.map(normalizar) ?? [];

	// El filtro por necesidad se aplica acá y no en SQL: con un inner join, un
	// lugar que necesita agua vendría con el resto de sus necesidades recortado,
	// y la tarjeta mostraría información incompleta.
	if (filtros.necesidad) {
		lugares = lugares.filter((l) =>
			l.necesidades.some((n) => n.etiqueta === filtros.necesidad && n.nivel !== 'no_recibir')
		);
	}

	return lugares.sort(ordenar);
}

export async function obtenerAprobado(id: string): Promise<LugarConNecesidades | null> {
	const { data } = await supabase
		.from('lugares')
		.select(CAMPOS)
		.eq('id', id)
		.eq('estado_moderacion', 'aprobado')
		.maybeSingle();
	return data ? normalizar(data as FilaCruda) : null;
}

/** Sin filtro de moderación: solo para /mi-lugar y /veeduria. */
export async function obtenerPorId(id: string): Promise<LugarConNecesidades | null> {
	const { data } = await supabase.from('lugares').select(CAMPOS).eq('id', id).maybeSingle();
	return data ? normalizar(data as FilaCruda) : null;
}

/** Ciudades con al menos un lugar aprobado — alimenta el filtro sin hardcodear. */
export async function listarCiudades(): Promise<string[]> {
	const { data } = await supabase
		.from('lugares')
		.select('ciudad')
		.eq('estado_moderacion', 'aprobado');

	const ciudades = new Set((data ?? []).map((f) => (f as { ciudad: string }).ciudad));
	return [...ciudades].sort((a, b) => a.localeCompare(b, 'es'));
}

export function leerFiltros(url: URL): Filtros {
	const limpio = (clave: string) => url.searchParams.get(clave)?.trim() || null;
	return {
		ciudad: limpio('ciudad'),
		tipo: limpio('tipo') as Filtros['tipo'],
		necesidad: limpio('necesidad') as Filtros['necesidad'],
		q: limpio('q')
	};
}

/** Reemplaza las necesidades de un lugar en bloque. */
export async function guardarNecesidades(lugarId: string, necesidades: Necesidad[]): Promise<void> {
	await supabase.from('lugar_necesidades').delete().eq('lugar_id', lugarId);
	if (!necesidades.length) return;

	const { error: err } = await supabase
		.from('lugar_necesidades')
		.insert(necesidades.map((n) => ({ lugar_id: lugarId, ...n })));
	if (err) caer('guardar necesidades', err);
}

import { error } from '@sveltejs/kit';
import { supabase } from './supabase';
import type {
	EstadoOperativo,
	EtiquetaNecesidad,
	Filtros,
	Item,
	ItemNuevo,
	LugarConNecesidades,
	Necesidad
} from '$lib/types';
import { ESTADOS_OPERATIVOS, NECESIDADES } from '$lib/constantes';

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

export const CAMPOS = `
  id, nombre, tipo, ciudad, departamento, direccion,
  barrio, edificio, torre, piso, apartamento, referencia, lat, lng,
  horario, contacto_publico, texto_libre,
  estado_operativo, estado_moderacion, nota_moderacion, creado_en, actualizado_en,
  lugar_necesidades ( etiqueta, nivel ),
  lugar_items ( id, texto, categoria, nivel, orden )
`;

type FilaCruda = Omit<LugarConNecesidades, 'necesidades' | 'items'> & {
	lugar_necesidades: Necesidad[] | null;
	lugar_items: Item[] | null;
};

/** El orden de los ítems lo fija quien los escribió; el id desempata. */
function porOrden(a: Item, b: Item): number {
	return a.orden - b.orden || a.id - b.id;
}

export function normalizar(fila: FilaCruda): LugarConNecesidades {
	const { lugar_necesidades, lugar_items, ...resto } = fila;
	return {
		...resto,
		necesidades: lugar_necesidades ?? [],
		items: (lugar_items ?? []).slice().sort(porOrden)
	};
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
				`nombre.ilike.%${escapado}%,direccion.ilike.%${escapado}%,` +
					`referencia.ilike.%${escapado}%,barrio.ilike.%${escapado}%,` +
					`edificio.ilike.%${escapado}%,texto_libre.ilike.%${escapado}%`
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
	//
	// Cuenta tanto la etiqueta general como los ítems escritos a mano: quien
	// puso "pañales talla 2" y nada más debe salir igual al filtrar por aseo.
	//
	// Con varias marcadas la regla es O y no Y: quien lleva agua y pañales
	// quiere ver todo punto que reciba cualquiera de las dos. Con Y la lista se
	// vaciaría casi siempre y parecería que no hay dónde ir.
	if (filtros.necesidades.length) {
		const buscadas = new Set<EtiquetaNecesidad>(filtros.necesidades);
		lugares = lugares.filter(
			(l) =>
				l.necesidades.some((n) => buscadas.has(n.etiqueta) && n.nivel !== 'no_recibir') ||
				l.items.some((i) => i.categoria && buscadas.has(i.categoria) && i.nivel !== 'no_recibir')
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

	// `necesidad=agua,aseo`. Se valida contra la lista conocida para que una URL
	// pegada a mano no meta basura en la consulta ni en los chips de la pantalla.
	const conocidas = new Set(NECESIDADES.map((n) => n.valor));
	const necesidades = (limpio('necesidad') ?? '')
		.split(',')
		.map((n) => n.trim())
		.filter((n): n is EtiquetaNecesidad => conocidas.has(n as EtiquetaNecesidad));

	return {
		ciudad: limpio('ciudad'),
		tipo: limpio('tipo') as Filtros['tipo'],
		necesidades: [...new Set(necesidades)],
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

/**
 * Reemplaza la lista de ítems en bloque. Borrar e insertar en vez de hacer un
 * diff porque la lista es corta y se reordena entera: el id de un ítem no
 * significa nada para nadie, no vale la pena preservarlo.
 */
export async function guardarItems(lugarId: string, items: ItemNuevo[]): Promise<void> {
	await supabase.from('lugar_items').delete().eq('lugar_id', lugarId);
	if (!items.length) return;

	const { error: err } = await supabase
		.from('lugar_items')
		.insert(items.map((item, i) => ({ lugar_id: lugarId, orden: i, ...item })));
	if (err) caer('guardar ítems', err);
}

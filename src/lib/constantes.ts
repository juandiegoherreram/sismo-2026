import type { EstadoOperativo, EtiquetaNecesidad, NivelNecesidad, TipoLugar } from './types';

export const TIPOS: { valor: TipoLugar; nombre: string; plural: string; emoji: string }[] = [
	{ valor: 'acopio', nombre: 'Centro de acopio', plural: 'Centros de acopio', emoji: '📦' },
	{ valor: 'sangre', nombre: 'Donación de sangre', plural: 'Donación de sangre', emoji: '🩸' },
	{ valor: 'voluntariado', nombre: 'Voluntariado', plural: 'Voluntariado', emoji: '🦺' },
	{ valor: 'albergue', nombre: 'Albergue', plural: 'Albergues', emoji: '🏠' }
];

/**
 * El dato más importante de la app: responde "¿voy o no voy?" antes que
 * cualquier otra cosa. `orden` decide el orden de la lista pública — los
 * saturados caen al fondo para empujar a la gente a donde sí hacen falta.
 */
export const ESTADOS_OPERATIVOS: {
	valor: EstadoOperativo;
	nombre: string;
	corto: string;
	descripcion: string;
	orden: number;
	clase: string;
	punto: string;
}[] = [
	{
		valor: 'necesita_gente',
		nombre: 'Necesitamos gente',
		corto: 'Necesita gente',
		descripcion: 'Hacen falta manos o donaciones ahora mismo',
		orden: 0,
		clase: 'bg-emerald-100 text-emerald-900 border-emerald-300',
		punto: 'bg-emerald-500'
	},
	{
		valor: 'estable',
		nombre: 'Estamos bien',
		corto: 'Operando',
		descripcion: 'Funcionando con normalidad, se puede llegar',
		orden: 1,
		clase: 'bg-sky-100 text-sky-900 border-sky-300',
		punto: 'bg-sky-500'
	},
	{
		valor: 'saturado',
		nombre: 'Saturado, no vengan',
		corto: 'Saturado',
		descripcion: 'Ya hay demasiada gente o no cabe más — mejor vayan a otro punto',
		orden: 2,
		clase: 'bg-amber-100 text-amber-900 border-amber-300',
		punto: 'bg-amber-500'
	},
	{
		valor: 'cerrado',
		nombre: 'Cerrado',
		corto: 'Cerrado',
		descripcion: 'No está operando en este momento',
		orden: 3,
		clase: 'bg-stone-200 text-stone-700 border-stone-300',
		punto: 'bg-stone-400'
	}
];

export const NECESIDADES: { valor: EtiquetaNecesidad; nombre: string; emoji: string }[] = [
	{ valor: 'agua', nombre: 'Agua', emoji: '💧' },
	{ valor: 'comida', nombre: 'Comida', emoji: '🍚' },
	{ valor: 'medicamentos', nombre: 'Medicamentos', emoji: '💊' },
	{ valor: 'aseo', nombre: 'Aseo', emoji: '🧼' },
	{ valor: 'ropa', nombre: 'Ropa', emoji: '👕' },
	{ valor: 'voluntarios', nombre: 'Voluntarios', emoji: '🙋' },
	{ valor: 'herramientas', nombre: 'Herramientas', emoji: '🛠️' },
	{ valor: 'transporte', nombre: 'Transporte', emoji: '🚚' }
];

/**
 * Semáforo, y se lee como tal en toda la app: verde se recibe, rojo hace falta
 * ya, amarillo no traigan más. El orden del array es el del ciclo de toques —
 * el primer toque deja «recibiendo», que es lo que quiere decir la mayoría.
 */
export const NIVELES: {
	valor: NivelNecesidad;
	nombre: string;
	corto: string;
	clase: string;
	punto: string;
}[] = [
	{
		valor: 'recibiendo',
		nombre: 'Recibiendo',
		corto: 'Recibiendo',
		clase: 'bg-emerald-100 text-emerald-900 border-emerald-300',
		punto: 'bg-emerald-500'
	},
	{
		valor: 'urgente',
		nombre: 'Urgente',
		corto: 'Urgente',
		clase: 'bg-red-100 text-red-900 border-red-300',
		punto: 'bg-red-500'
	},
	{
		valor: 'no_recibir',
		nombre: 'Ya no recibimos',
		corto: 'Ya no',
		clase: 'bg-amber-100 text-amber-900 border-amber-300',
		punto: 'bg-amber-500'
	}
];

/**
 * Siguiente estado de un toque: sin marcar → recibiendo → urgente → ya no →
 * sin marcar. Vive acá y no en cada componente para que el chip de categorías
 * del formulario y el de cada ítem se comporten igual.
 */
export function siguienteNivel(actual: NivelNecesidad | null | undefined): NivelNecesidad | null {
	const i = NIVELES.findIndex((n) => n.valor === actual);
	return i === -1 ? NIVELES[0].valor : (NIVELES[i + 1]?.valor ?? null);
}

export const MOTIVOS_REPORTE: { valor: string; nombre: string }[] = [
	{ valor: 'ya_no_reciben', nombre: 'Ya no reciben donaciones' },
	{ valor: 'saturado', nombre: 'Está saturado, hay demasiada gente' },
	{ valor: 'cerrado', nombre: 'Está cerrado' },
	{ valor: 'direccion_mala', nombre: 'La dirección está mal' }
];

// Mapas de consulta rápida, para no recorrer los arrays en cada tarjeta.
export const TIPO_POR_VALOR = new Map(TIPOS.map((t) => [t.valor, t]));
export const ESTADO_POR_VALOR = new Map(ESTADOS_OPERATIVOS.map((e) => [e.valor, e]));
export const NECESIDAD_POR_VALOR = new Map(NECESIDADES.map((n) => [n.valor, n]));
export const NIVEL_POR_VALOR = new Map(NIVELES.map((n) => [n.valor, n]));

/** Centro aproximado de Colombia, para el primer render del mapa sin datos. */
export const CENTRO_COLOMBIA: [number, number] = [4.6482, -74.0776];

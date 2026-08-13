export type TipoLugar = 'acopio' | 'sangre' | 'voluntariado' | 'albergue';

export type EstadoOperativo = 'necesita_gente' | 'estable' | 'saturado' | 'cerrado';

export type EstadoModeracion = 'pendiente' | 'aprobado' | 'rechazado';

export type EtiquetaNecesidad =
	| 'comida'
	| 'agua'
	| 'ropa'
	| 'aseo'
	| 'medicamentos'
	| 'voluntarios'
	| 'herramientas'
	| 'transporte';

export type NivelNecesidad = 'urgente' | 'recibiendo' | 'no_recibir';

export type RolToken = 'editor' | 'veedor';

export type EstadoToken = 'activo' | 'revocado';

export type MotivoReporte = 'ya_no_reciben' | 'saturado' | 'cerrado' | 'direccion_mala';

export interface Necesidad {
	etiqueta: EtiquetaNecesidad;
	nivel: NivelNecesidad;
}

export interface Lugar {
	id: string;
	nombre: string;
	tipo: TipoLugar;
	ciudad: string;
	departamento: string;
	direccion: string;
	/** Detalle de ubicación propio, no lo que devuelva un geocodificador. */
	barrio: string | null;
	edificio: string | null;
	torre: string | null;
	piso: string | null;
	apartamento: string | null;
	referencia: string | null;
	lat: number | null;
	lng: number | null;
	horario: string | null;
	contacto_publico: string | null;
	/** Párrafo que el responsable escribe y actualiza a su aire. */
	texto_libre: string | null;
	estado_operativo: EstadoOperativo;
	estado_moderacion: EstadoModeracion;
	nota_moderacion: string | null;
	creado_en: string;
	actualizado_en: string;
}

/** Un ítem concreto de la lista de necesidades: "pañales talla 2". */
export interface Item {
	id: number;
	texto: string;
	/** Null si la heurística no adivinó y nadie la corrigió. */
	categoria: EtiquetaNecesidad | null;
	nivel: NivelNecesidad;
	orden: number;
}

/** Ítem tal como lo manda el formulario, todavía sin id. */
export type ItemNuevo = Pick<Item, 'texto' | 'categoria' | 'nivel'>;

/** Un lugar con sus necesidades e ítems ya resueltos — lo que consume la UI. */
export interface LugarConNecesidades extends Lugar {
	necesidades: Necesidad[];
	items: Item[];
}

export interface Token {
	id: string;
	token_hash: string;
	rol: RolToken;
	lugar_id: string | null;
	etiqueta: string;
	canal: string | null;
	estado: EstadoToken;
	creado_en: string;
	usado_en: string | null;
}

export interface Reporte {
	id: number;
	lugar_id: string;
	motivo: MotivoReporte;
	ip_hash: string;
	atendido: boolean;
	creado_en: string;
}

export interface Edicion {
	id: number;
	lugar_id: string | null;
	token_id: string | null;
	accion: string;
	diff: Record<string, unknown> | null;
	creado_en: string;
}

/** Filtros de la consulta pública, espejo de los query params de la URL. */
export interface Filtros {
	ciudad: string | null;
	tipo: TipoLugar | null;
	/**
	 * Varias a la vez y en O: quien sale de la casa con agua y pañales quiere
	 * ver todo punto que reciba cualquiera de las dos, no solo los que piden
	 * ambas. Viaja en la URL como `necesidad=agua,aseo`.
	 */
	necesidades: EtiquetaNecesidad[];
	q: string | null;
}

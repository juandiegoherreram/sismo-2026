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
	referencia: string | null;
	lat: number | null;
	lng: number | null;
	horario: string | null;
	contacto_publico: string | null;
	nota: string | null;
	estado_operativo: EstadoOperativo;
	estado_moderacion: EstadoModeracion;
	nota_moderacion: string | null;
	creado_en: string;
	actualizado_en: string;
}

/** Un lugar con sus necesidades ya resueltas — lo que consume la UI. */
export interface LugarConNecesidades extends Lugar {
	necesidades: Necesidad[];
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
	necesidad: EtiquetaNecesidad | null;
	q: string | null;
}

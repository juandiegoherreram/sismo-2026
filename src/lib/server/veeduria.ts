import { supabase } from './supabase';
import type { EstadoModeracion, EstadoOperativo, Token } from '$lib/types';

export { detectarDuplicados } from '$lib/duplicados';

/** Un acceso con el lugar que reclamó, que es como se mira en la pantalla. */
export interface Persona extends Token {
	lugar: {
		id: string;
		nombre: string;
		ciudad: string;
		estado_moderacion: EstadoModeracion;
		estado_operativo: EstadoOperativo;
		actualizado_en: string;
	} | null;
}

export async function listarTokens(): Promise<Token[]> {
	const { data } = await supabase
		.from('tokens')
		.select('*')
		.order('creado_en', { ascending: false })
		.limit(200);
	return (data ?? []) as Token[];
}

/**
 * El directorio de quién es quién: cada acceso entregado junto al lugar que
 * terminó registrando. Es lo que permite hacer veeduría de verdad —ver quién
 * recibió un link y nunca lo usó, o quién lleva dos días sin actualizar— en
 * vez de mirar una lista de tokens sueltos.
 */
export async function listarPersonas(): Promise<Persona[]> {
	const { data } = await supabase
		.from('tokens')
		.select(
			'*, lugares ( id, nombre, ciudad, estado_moderacion, estado_operativo, actualizado_en )'
		)
		.order('creado_en', { ascending: false })
		.limit(500);

	return (data ?? []).map((fila) => {
		const { lugares, ...resto } = fila as Token & { lugares: Persona['lugar'] };
		return { ...resto, lugar: lugares ?? null };
	});
}

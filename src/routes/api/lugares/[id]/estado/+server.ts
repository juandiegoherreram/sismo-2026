import { error, json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { leerToken, marcarUso, registrarEdicion, requireToken } from '$lib/server/auth';
import { validateEstadoOperativo } from '$lib/server/validate';
import type { RequestHandler } from './$types';

/**
 * La acción más usada de toda la app: un toque, de pie, con una mano. Se deja
 * en su propio endpoint para que el payload sea mínimo y responda con red mala.
 */
export const POST: RequestHandler = async ({ request, url, params }) => {
	const token = await requireToken(leerToken(url, request));

	// El lugar sale del token, no de la URL; el id solo se verifica.
	if (!token.lugar_id) throw error(409, 'Todavía no ha registrado su lugar');
	if (token.lugar_id !== params.id) throw error(403, 'Ese lugar no le pertenece');

	const cuerpo = await request.json().catch(() => null);
	const estado = validateEstadoOperativo(cuerpo?.estado_operativo);

	const { error: err } = await supabase
		.from('lugares')
		.update({ estado_operativo: estado, actualizado_en: new Date().toISOString() })
		.eq('id', token.lugar_id);

	if (err) throw error(500, 'No se pudo actualizar el estado');

	// Quien manda es el responsable del sitio: si acaba de confirmar el estado,
	// los reportes del público sobre ese lugar dejan de ser noticia.
	await supabase
		.from('reportes')
		.update({ atendido: true })
		.eq('lugar_id', token.lugar_id)
		.eq('atendido', false);

	await marcarUso(token.id);
	await registrarEdicion(token.lugar_id, token.id, 'estado', { estado_operativo: estado });

	return json({ ok: true });
};

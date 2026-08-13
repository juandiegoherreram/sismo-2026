import { error, json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { leerToken, registrarEdicion, requireVeedor } from '$lib/server/auth';
import { validateOptionalText } from '$lib/server/validate';
import type { EstadoModeracion } from '$lib/types';
import type { RequestHandler } from './$types';

const ACCIONES: Record<string, EstadoModeracion> = {
	aprobar: 'aprobado',
	rechazar: 'rechazado',
	pendiente: 'pendiente'
};

/** Moderación. Solo veeduría. */
export const PATCH: RequestHandler = async ({ request, url, params }) => {
	const token = await requireVeedor(leerToken(url, request));

	const cuerpo = await request.json().catch(() => null);
	const estado = ACCIONES[cuerpo?.accion as string];
	if (!estado) throw error(400, 'Acción inválida');

	const nota = validateOptionalText(cuerpo?.nota_moderacion, 300);
	if (estado === 'rechazado' && !nota) throw error(400, 'Escriba el motivo del rechazo');

	// No se toca actualizado_en: moderar no es información nueva para el
	// público, y no debe resetear el "actualizado hace X" de la tarjeta.
	const { error: err } = await supabase
		.from('lugares')
		.update({ estado_moderacion: estado, nota_moderacion: nota })
		.eq('id', params.id);

	if (err) throw error(500, 'No se pudo moderar el lugar');

	await registrarEdicion(params.id, token.id, `moderar:${estado}`, { nota });
	return json({ ok: true });
};

/** Borrado definitivo, para spam evidente. Arrastra necesidades y reportes. */
export const DELETE: RequestHandler = async ({ request, url, params }) => {
	const token = await requireVeedor(leerToken(url, request));

	await registrarEdicion(null, token.id, 'borrar', { lugar_id: params.id });

	const { error: err } = await supabase.from('lugares').delete().eq('id', params.id);
	if (err) throw error(500, 'No se pudo borrar el lugar');

	return json({ ok: true });
};

import { json } from '@sveltejs/kit';
import { marcarUso, registrarEdicion, requireLugar } from '$lib/server/auth';
import { marcarReportesAtendidos } from '$lib/server/reportes';
import type { RequestHandler } from './$types';

/**
 * "Ya lo revisé": el responsable del lugar da por atendidos los reportes que le
 * llegaron. No borra nada ni contradice a quien reportó — solo dice que ya miró
 * y, si hacía falta, corrigió. Hasta que lo haga, veeduría los sigue viendo.
 *
 * `requireLugar` amarra la acción al lugar del token, así que nadie puede
 * apagar los reportes de un lugar ajeno mandando otro id.
 */
export const POST: RequestHandler = async (event) => {
	const { token, lugarId } = await requireLugar(event);

	await marcarReportesAtendidos(lugarId);
	await marcarUso(token.id);
	await registrarEdicion(lugarId, token.id, 'reportes_atendidos');

	return json({ ok: true });
};

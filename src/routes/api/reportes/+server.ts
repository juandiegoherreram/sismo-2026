import { error, json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { hashToken } from '$lib/server/auth';
import { validateMotivo, validateText } from '$lib/server/validate';
import type { RequestHandler } from './$types';

const VENTANA_MIN = 10;
const MAX_POR_VENTANA = 5;

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const cuerpo = await request.json().catch(() => null);
	if (!cuerpo) throw error(400, 'Petición inválida');

	const lugarId = validateText(cuerpo.lugar_id, 'Lugar', 40);
	const motivo = validateMotivo(cuerpo.motivo);

	// Se guarda el hash de la IP, no la IP: sirve para limitar abuso sin
	// construir un registro de quién consultó qué.
	const ipHash = await hashToken(getClientAddress());
	const desde = new Date(Date.now() - VENTANA_MIN * 60_000).toISOString();

	const { count } = await supabase
		.from('reportes')
		.select('id', { count: 'exact', head: true })
		.eq('ip_hash', ipHash)
		.gte('creado_en', desde);

	if ((count ?? 0) >= MAX_POR_VENTANA) {
		throw error(429, 'Demasiados reportes seguidos. Intente de nuevo en unos minutos.');
	}

	const { error: err } = await supabase
		.from('reportes')
		.insert({ lugar_id: lugarId, motivo, ip_hash: ipHash });

	// Un lugar_id inexistente rebota por la foreign key.
	if (err) throw error(400, 'No se pudo registrar el reporte');

	return json({ ok: true });
};

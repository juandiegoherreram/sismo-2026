import { requireSesionVeedor } from '$lib/server/auth';
import { supabase } from '$lib/server/supabase';
import { CAMPOS, normalizar } from '$lib/server/lugares';
import { listarReportesPendientes } from '$lib/server/reportes';
import { detectarDuplicados } from '$lib/server/veeduria';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	event.setHeaders({ 'cache-control': 'private, no-store' });
	requireSesionVeedor(event);

	const { data } = await supabase
		.from('lugares')
		.select(CAMPOS)
		.order('creado_en', { ascending: false });

	const lugares = ((data ?? []) as Parameters<typeof normalizar>[0][]).map(normalizar);
	const reportes = await listarReportesPendientes();

	// El Map no sobrevive la serialización del load: se manda como objeto plano.
	const duplicados = Object.fromEntries(detectarDuplicados(lugares));

	// Los reportes se entregan agrupados por lugar: en la pantalla no son una
	// cola aparte sino una marca sobre el lugar publicado que los recibió.
	const reportesPorLugar: Record<string, typeof reportes> = {};
	for (const reporte of reportes) {
		(reportesPorLugar[reporte.lugar_id] ??= []).push(reporte);
	}

	return { lugares, duplicados, reportesPorLugar };
};

import { error } from '@sveltejs/kit';
import { leerToken, requireVeedor } from '$lib/server/auth';
import { supabase } from '$lib/server/supabase';
import { detectarDuplicados, listarReportesPendientes, listarTokens } from '$lib/server/veeduria';
import type { LugarConNecesidades, Necesidad } from '$lib/types';
import type { PageServerLoad } from './$types';

type FilaCruda = Omit<LugarConNecesidades, 'necesidades'> & {
	lugar_necesidades: Necesidad[] | null;
};

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });

	const valor = leerToken(url);
	if (!valor) throw error(401, 'Abra el link de veeduría');
	await requireVeedor(valor);

	const { data } = await supabase
		.from('lugares')
		.select('*, lugar_necesidades ( etiqueta, nivel )')
		.order('creado_en', { ascending: false });

	const lugares: LugarConNecesidades[] = ((data ?? []) as FilaCruda[]).map((fila) => {
		const { lugar_necesidades, ...resto } = fila;
		return { ...resto, necesidades: lugar_necesidades ?? [] };
	});

	const [tokens, reportes] = await Promise.all([listarTokens(), listarReportesPendientes()]);

	// El Map no sobrevive la serialización del load: se manda como objeto plano.
	const duplicados = Object.fromEntries(detectarDuplicados(lugares));

	// Conteo de reportes por lugar, para subir al tope lo que el público señala.
	const reportesPorLugar: Record<string, number> = {};
	for (const reporte of reportes) {
		reportesPorLugar[reporte.lugar_id] = (reportesPorLugar[reporte.lugar_id] ?? 0) + 1;
	}

	return { lugares, tokens, reportes, duplicados, reportesPorLugar };
};

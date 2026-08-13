import { supabase } from './supabase';
import type { Reporte, Token } from '$lib/types';

export { detectarDuplicados } from '$lib/duplicados';

export async function listarTokens(): Promise<Token[]> {
	const { data } = await supabase
		.from('tokens')
		.select('*')
		.order('creado_en', { ascending: false })
		.limit(200);
	return (data ?? []) as Token[];
}

export async function listarReportesPendientes(): Promise<(Reporte & { lugar_nombre: string })[]> {
	const { data } = await supabase
		.from('reportes')
		.select('*, lugares ( nombre )')
		.eq('atendido', false)
		.order('creado_en', { ascending: false })
		.limit(100);

	return (data ?? []).map((fila) => {
		const { lugares, ...resto } = fila as Reporte & { lugares: { nombre: string } | null };
		return { ...resto, lugar_nombre: lugares?.nombre ?? '(borrado)' };
	});
}

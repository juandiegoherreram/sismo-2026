import { supabase } from './supabase';
import type { Reporte } from '$lib/types';

/**
 * Lo que reporta el público sobre un lugar: "ya no reciben", "está saturado".
 *
 * Un reporte no es una queja contra quien coordina el sitio: es alguien parado
 * en la puerta viendo algo distinto a lo que dice la pantalla. Por eso llega
 * primero al panel de quien maneja el lugar —que es el único que puede
 * arreglarlo en diez segundos— y no a la cola de moderación.
 */

export async function listarReportesPendientes(): Promise<Reporte[]> {
	const { data } = await supabase
		.from('reportes')
		.select('*')
		.eq('atendido', false)
		.order('creado_en', { ascending: false })
		.limit(200);

	return (data ?? []) as Reporte[];
}

export async function listarReportesDeLugar(lugarId: string): Promise<Reporte[]> {
	const { data } = await supabase
		.from('reportes')
		.select('*')
		.eq('lugar_id', lugarId)
		.eq('atendido', false)
		.order('creado_en', { ascending: false })
		.limit(50);

	return (data ?? []) as Reporte[];
}

/**
 * Los da por atendidos. Lo hace el responsable del lugar cuando ya revisó y,
 * si hacía falta, corrigió: mientras haya reportes sin atender, veeduría los
 * ve en su lista de publicados.
 */
export async function marcarReportesAtendidos(lugarId: string): Promise<void> {
	await supabase.from('reportes').update({ atendido: true }).eq('lugar_id', lugarId).eq('atendido', false);
}

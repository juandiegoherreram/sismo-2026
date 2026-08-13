import { requireSesion } from '$lib/server/auth';
import { obtenerPorId } from '$lib/server/lugares';
import { listarReportesDeLugar } from '$lib/server/reportes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// Pantalla personal detrás de una sesión: nunca debe quedar en una caché
	// compartida ni en la del navegador.
	event.setHeaders({ 'cache-control': 'private, no-store' });

	const token = requireSesion(event);
	const lugar = token.lugar_id ? await obtenerPorId(token.lugar_id) : null;

	// Lo que el público reportó sobre este lugar llega acá y no a veeduría: el
	// único que puede arreglar un "ya no reciben" en diez segundos es quien está
	// parado adentro.
	const reportes = token.lugar_id ? await listarReportesDeLugar(token.lugar_id) : [];

	return {
		lugar,
		reportes,
		rol: token.rol,
		etiquetaToken: token.etiqueta
	};
};

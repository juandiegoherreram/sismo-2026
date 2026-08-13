import { error } from '@sveltejs/kit';
import { leerToken, requireToken } from '$lib/server/auth';
import { obtenerPorId } from '$lib/server/lugares';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	// Pantalla personal detrás de un token: nunca debe quedar en una caché
	// compartida ni en la del navegador.
	setHeaders({ 'cache-control': 'private, no-store' });

	const valor = leerToken(url);
	if (!valor) throw error(401, 'Abra el link de acceso que le enviamos');

	const token = await requireToken(valor);
	const lugar = token.lugar_id ? await obtenerPorId(token.lugar_id) : null;

	return {
		lugar,
		rol: token.rol,
		etiquetaToken: token.etiqueta
	};
};

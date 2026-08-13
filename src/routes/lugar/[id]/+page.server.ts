import { error } from '@sveltejs/kit';
import { obtenerAprobado } from '$lib/server/lugares';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const lugar = await obtenerAprobado(params.id);
	if (!lugar) throw error(404, 'Este lugar no existe o todavía no fue aprobado');

	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=30' });
	return { lugar };
};

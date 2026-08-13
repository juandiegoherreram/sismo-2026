import { leerFiltros, listarAprobados, listarCiudades } from '$lib/server/lugares';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const filtros = leerFiltros(url);
	const [lugares, ciudades] = await Promise.all([listarAprobados(filtros), listarCiudades()]);

	// Cache muy corto: alivia picos de tráfico sin que un cambio de estado tarde
	// en verse. En emergencia 30 s es el máximo tolerable de dato viejo.
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=30' });

	return { lugares, ciudades, filtros };
};

import { requireSesionVeedor } from '$lib/server/auth';
import { listarPersonas } from '$lib/server/veeduria';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	event.setHeaders({ 'cache-control': 'private, no-store' });
	const veedor = requireSesionVeedor(event);

	return {
		personas: await listarPersonas(),
		// Para que la pantalla sepa cuál fila es la suya y no ofrezca revocarla.
		yo: veedor.id
	};
};

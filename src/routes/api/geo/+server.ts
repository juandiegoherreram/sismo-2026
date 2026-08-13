import { json } from '@sveltejs/kit';
import { buscarDireccion, ubicacionInversa } from '$lib/server/geo';
import { requireAcceso } from '$lib/server/auth';
import type { RequestHandler } from './$types';

/**
 * Búsqueda de direcciones para el formulario de registro.
 *
 * Detrás de sesión a propósito: solo lo usa quien está registrando o editando
 * su lugar, y así el endpoint no queda de proxy abierto contra el
 * geocodificador para cualquiera que lo encuentre.
 */
export const GET: RequestHandler = async (event) => {
	await requireAcceso(event);

	const { searchParams } = event.url;
	const lat = Number(searchParams.get('lat'));
	const lng = Number(searchParams.get('lng'));

	if (Number.isFinite(lat) && Number.isFinite(lng) && searchParams.has('lat')) {
		return json({ resultados: [await ubicacionInversa(lat, lng)].filter(Boolean) });
	}

	return json({ resultados: await buscarDireccion(searchParams.get('q') ?? '') });
};

import { error, json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { marcarUso, registrarEdicion, requireLugar } from '$lib/server/auth';
import { guardarItems } from '$lib/server/lugares';
import { validateItems, validateOptionalText } from '$lib/server/validate';
import type { RequestHandler } from './$types';

/**
 * El párrafo libre y la lista de ítems, aparte del formulario completo.
 *
 * Es lo que más cambia: la dirección se escribe una vez y el "hoy nos hacen
 * falta pañales talla 2" se corrige tres veces al día. Con su propio endpoint,
 * actualizarlo no obliga a reenviar ni revalidar el resto del lugar.
 */
export const PUT: RequestHandler = async (event) => {
	const { token, lugarId } = await requireLugar(event);

	const cuerpo = await event.request.json().catch(() => null);
	if (!cuerpo) throw error(400, 'Petición inválida');

	const texto_libre = validateOptionalText(cuerpo.texto_libre, 2000);
	const items = validateItems(cuerpo.items);

	const { error: err } = await supabase
		.from('lugares')
		.update({ texto_libre, actualizado_en: new Date().toISOString() })
		.eq('id', lugarId);

	if (err) throw error(500, 'No se pudieron guardar los cambios');

	await guardarItems(lugarId, items);
	await marcarUso(token.id);
	await registrarEdicion(lugarId, token.id, 'contenido', {
		texto_libre,
		items: items.length
	});

	return json({ ok: true, items });
};

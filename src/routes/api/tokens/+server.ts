import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { supabase } from '$lib/server/supabase';
import { generarToken, hashToken, registrarEdicion, requireVeedor } from '$lib/server/auth';
import { validateOptionalText, validateText } from '$lib/server/validate';
import { waSend, whatsappConfigurado } from '$lib/server/whatsapp-api';
import type { RequestHandler } from './$types';

function armarMensaje(link: string): string {
	return (
		'Hola 👋 Le compartimos el acceso para registrar su punto en el directorio del sismo.\n\n' +
		'Con este link puede publicar su lugar y, sobre todo, avisar si necesitan gente o si ya están saturados:\n' +
		`${link}\n\n` +
		'Guarde este mensaje: es su única forma de entrar. No lo comparta con nadie más.'
	);
}

/** Genera un token nuevo. Solo veeduría. */
export const POST: RequestHandler = async (event) => {
	const veedor = await requireVeedor(event);

	const cuerpo = await event.request.json().catch(() => null);
	if (!cuerpo) throw error(400, 'Petición inválida');

	const etiqueta = validateText(cuerpo.etiqueta, 'La descripción', 160, 2);
	const canal = validateOptionalText(cuerpo.canal, 40);
	const telefono = validateOptionalText(cuerpo.telefono, 20);
	const rol = cuerpo.rol === 'veedor' ? 'veedor' : 'editor';

	const valor = generarToken();
	const { data, error: err } = await supabase
		.from('tokens')
		.insert({ token_hash: await hashToken(valor), etiqueta, canal, rol })
		.select('id')
		.single();

	if (err || !data) throw error(500, 'No se pudo generar el acceso');

	const base = env.PUBLIC_SITE_URL || event.url.origin;
	const link = `${base}${rol === 'veedor' ? '/veeduria' : '/mi-lugar'}?k=${valor}`;

	await registrarEdicion(null, veedor.id, 'token:crear', { etiqueta, rol, canal });

	// El envío es un extra: si Meta falla o no está configurado, se devuelve el
	// link igual para copiarlo a mano. La app nunca depende de la Cloud API.
	let enviado = false;
	let fallo: string | null = null;
	if (telefono && whatsappConfigurado()) {
		try {
			await waSend(telefono.replace(/\D/g, ''), armarMensaje(link));
			enviado = true;
		} catch {
			fallo = 'No se pudo enviar por WhatsApp. Copie el link y mándelo a mano.';
		}
	}

	// Única vez que el token viaja en claro: después solo existe su hash.
	return json({ id: data.id, link, mensaje: armarMensaje(link), enviado, fallo }, { status: 201 });
};

/**
 * Cambia la etiqueta de un acceso — corregir un nombre mal escrito o anotar
 * "ya no responde" sin perder el historial de quién tiene qué.
 */
export const PATCH: RequestHandler = async (event) => {
	const veedor = await requireVeedor(event);

	const cuerpo = await event.request.json().catch(() => null);
	const id = validateText(cuerpo?.id, 'El acceso', 40);
	const etiqueta = validateText(cuerpo?.etiqueta, 'La descripción', 160, 2);

	const { error: err } = await supabase.from('tokens').update({ etiqueta }).eq('id', id);
	if (err) throw error(500, 'No se pudo actualizar el acceso');

	await registrarEdicion(null, veedor.id, 'token:editar', { token_id: id, etiqueta });
	return json({ ok: true });
};

/** Revoca un token. El link deja de servir de inmediato. */
export const DELETE: RequestHandler = async (event) => {
	const veedor = await requireVeedor(event);

	const cuerpo = await event.request.json().catch(() => null);
	const id = validateText(cuerpo?.id, 'El acceso', 40);

	if (id === veedor.id) throw error(400, 'No puede revocar su propio acceso');

	const { error: err } = await supabase.from('tokens').update({ estado: 'revocado' }).eq('id', id);
	if (err) throw error(500, 'No se pudo revocar el acceso');

	await registrarEdicion(null, veedor.id, 'token:revocar', { token_id: id });
	return json({ ok: true });
};

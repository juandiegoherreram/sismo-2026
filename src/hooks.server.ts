import { redirect, type Handle } from '@sveltejs/kit';
import { COOKIE_ACCESO, buscarTokenActivo } from '$lib/server/auth';

/** 30 días: cubre de sobra una emergencia sin volverse una sesión eterna. */
const DURACION = 60 * 60 * 24 * 30;

/**
 * El link mágico es la única autenticación de la app. Acá se canjea:
 * llega `?k=…`, se valida contra la base, se guarda en una cookie httpOnly y
 * se redirige a la misma URL ya sin el token.
 *
 * Por qué sacarlo de la URL cuanto antes: mientras vive ahí queda en el
 * historial del navegador, en el `Referer` de cualquier link saliente y en la
 * captura de pantalla que la gente manda por WhatsApp para pedir ayuda. Con la
 * cookie puesta, el link original sigue funcionando cuantas veces quieran
 * abrirlo, que es como la gente lo va a usar: guardado en un chat.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const { url, cookies, locals } = event;

	const enUrl = url.searchParams.get('k')?.trim();
	if (enUrl) {
		const token = await buscarTokenActivo(enUrl);

		const destino = new URL(url);
		destino.searchParams.delete('k');

		if (token) {
			cookies.set(COOKIE_ACCESO, enUrl, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: url.protocol === 'https:',
				maxAge: DURACION
			});
			// Un veedor que abre un link de editor, o al revés, va a donde le sirve.
			if (destino.pathname === '/mi-lugar' && token.rol === 'veedor') destino.pathname = '/veeduria';
		} else {
			// Sin token válido no se pisa la cookie que ya tuviera: puede ser
			// alguien reusando un link viejo desde una sesión que sí sirve.
			destino.pathname = '/entrar';
			destino.search = '';
			destino.searchParams.set('error', 'invalido');
		}

		throw redirect(303, destino.pathname + destino.search);
	}

	const guardado = cookies.get(COOKIE_ACCESO);
	if (guardado) {
		const token = await buscarTokenActivo(guardado);
		if (token) locals.acceso = token;
		// Token revocado o borrado: se limpia para que /entrar no quede en bucle.
		else cookies.delete(COOKIE_ACCESO, { path: '/' });
	}

	return resolve(event);
};

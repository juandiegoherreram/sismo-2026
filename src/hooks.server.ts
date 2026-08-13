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
 *
 * ── Sobre los redirects ────────────────────────────────────────────────────
 * Netlify le vuelve a pegar el query string de la petición a cualquier
 * `Location` relativa. O sea que responder `/veeduria` para limpiar el `?k=`
 * llega al navegador como `/veeduria?k=…`, el hook lo procesa de nuevo y se
 * arma un bucle infinito de redirects. En local no se ve, porque ahí no hay
 * proxy de por medio.
 *
 * Por eso las dos defensas de abajo, que son independientes a propósito:
 *
 *   1. Los redirects salen con URL absoluta, que Netlify sí respeta.
 *   2. Aunque el `k` sobreviva, no se vuelve a canjear si la cookie ya vale lo
 *      mismo. Con eso el bucle es imposible por construcción, y lo peor que
 *      puede pasar es que el token quede visible en la barra.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const { url, cookies, locals } = event;

	const enUrl = url.searchParams.get('k')?.trim();
	const guardado = cookies.get(COOKIE_ACCESO);

	// `enUrl !== guardado`: si el token de la URL ya es el de la sesión, esto no
	// es alguien entrando sino un query que sobrevivió al redirect. Se ignora.
	if (enUrl && enUrl !== guardado) {
		const token = await buscarTokenActivo(enUrl);

		if (token) {
			cookies.set(COOKIE_ACCESO, enUrl, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: url.protocol === 'https:',
				maxAge: DURACION
			});

			const destino = new URL(url);
			destino.searchParams.delete('k');

			// Cada quien a la pantalla que le sirve, venga por donde venga.
			if (destino.pathname === '/entrar' || destino.pathname === '/') {
				destino.pathname = token.rol === 'veedor' ? '/veeduria' : '/mi-lugar';
			} else if (destino.pathname === '/mi-lugar' && token.rol === 'veedor') {
				destino.pathname = '/veeduria';
			}

			throw redirect(303, destino.toString());
		}

		// Token inválido. Se manda a /entrar, salvo que ya estemos ahí con el
		// aviso puesto: si Netlify devuelve el `k` muerto, este es el freno que
		// evita rebotar contra /entrar para siempre.
		const yaAvisado = url.pathname === '/entrar' && url.searchParams.get('error') === 'invalido';
		if (!yaAvisado) {
			throw redirect(303, new URL('/entrar?error=invalido', url.origin).toString());
		}
	}

	if (guardado) {
		const token = await buscarTokenActivo(guardado);
		if (token) locals.acceso = token;
		// Token revocado o borrado: se limpia para que /entrar no quede en bucle.
		else cookies.delete(COOKIE_ACCESO, { path: '/' });
	}

	return resolve(event);
};

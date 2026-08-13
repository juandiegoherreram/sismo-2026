import { fail, redirect } from '@sveltejs/kit';
import { COOKIE_ACCESO, buscarTokenActivo } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });

	// Ya tiene sesión: no tiene nada que hacer acá.
	if (locals.acceso) {
		throw redirect(303, locals.acceso.rol === 'veedor' ? '/veeduria' : '/mi-lugar');
	}

	return { expiro: url.searchParams.get('error') === 'invalido' };
};

/**
 * Segunda puerta, para cuando el link ya no abre solo: el celular se cambió,
 * el navegador borró la cookie, o el link llegó por un chat que no lo hace
 * clickeable. Se puede pegar el link entero o dictar solo el código.
 */
export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const datos = await request.formData();
		const crudo = String(datos.get('acceso') ?? '').trim();
		if (!crudo) return fail(400, { mensaje: 'Pegue el link o escriba el código' });

		// Del link pegado se saca el `k=`; si no lo tiene, se asume que es el código.
		const valor = crudo.includes('k=')
			? (crudo.split('k=').pop() ?? '').split(/[&#\s]/)[0].trim()
			: crudo.replace(/\s+/g, '').toUpperCase();

		const token = await buscarTokenActivo(valor);
		if (!token) {
			return fail(401, { mensaje: 'Ese acceso no es válido o fue revocado. Escríbanos y le damos otro.' });
		}

		cookies.set(COOKIE_ACCESO, valor, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 30
		});

		throw redirect(303, token.rol === 'veedor' ? '/veeduria' : '/mi-lugar');
	}
};

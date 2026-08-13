import { redirect } from '@sveltejs/kit';
import { COOKIE_ACCESO } from '$lib/server/auth';
import type { RequestHandler } from './$types';

/**
 * Cierra la sesión en este dispositivo. No revoca el token: el link sigue
 * sirviendo, que es justo lo que se necesita cuando alguien entra desde un
 * celular prestado y quiere dejarlo limpio.
 *
 * Solo POST, para que no lo dispare un prefetch ni una imagen incrustada.
 */
export const POST: RequestHandler = ({ cookies }) => {
	cookies.delete(COOKIE_ACCESO, { path: '/' });
	throw redirect(303, '/');
};

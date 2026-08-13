import type { LayoutServerLoad } from './$types';

/**
 * Solo el rol, nunca el token: es lo justo para decidir qué link mostrar en el
 * encabezado. Si esto devolviera el acceso completo, quedaría serializado en
 * el HTML de todas las páginas, incluidas las públicas.
 */
export const load: LayoutServerLoad = ({ locals }) => ({
	sesion: locals.acceso ? { rol: locals.acceso.rol } : null
});

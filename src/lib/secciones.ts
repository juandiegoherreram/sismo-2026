/**
 * La app son tres cosas distintas viviendo en el mismo dominio: buscar dónde
 * ayudar, mantener el punto propio y moderar el directorio. Quien trabaja acá
 * las tiene abiertas al tiempo, en tres pestañas, y con el mismo ícono verde en
 * todas termina cambiando de pestaña a ciegas —o peor, moderando en la que
 * creía que era su punto.
 *
 * Cada sección trae su color y su ícono. La pestaña se reconoce sin leer el
 * título, y la franja de arriba confirma dónde está uno apenas carga.
 */

export interface Seccion {
	nombre: string;
	/** Color de la franja del encabezado y del `theme-color` del navegador. */
	color: string;
	/** Favicon propio, ya como data URI. */
	icono: string;
}

/**
 * El ícono se arma acá y no como archivo estático para que color y dibujo no
 * se puedan desincronizar: son el mismo dato.
 */
function svg(fondo: string, trazo: string, dibujo: string): string {
	const marcado =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
		`<rect width="64" height="64" rx="14" fill="${fondo}"/>` +
		`<g fill="none" stroke="${trazo}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${dibujo}</g>` +
		`</svg>`;
	return `data:image/svg+xml,${encodeURIComponent(marcado)}`;
}

/** Público: el mismo latido del favicon de siempre. Verde de la marca. */
const PUBLICA: Seccion = {
	nombre: 'Directorio',
	color: '#0d5b47',
	icono: svg('#0d5b47', '#70e2be', '<path d="M6 34h10l6-16 8 30 7-22 5 8h16"/>')
};

/** Mi lugar: un pin. Ámbar, el color de "esto es suyo y hay que mantenerlo". */
const MI_LUGAR: Seccion = {
	nombre: 'Mi lugar',
	color: '#b45309',
	icono: svg(
		'#b45309',
		'#fde68a',
		'<path d="M32 54s14-16 14-26a14 14 0 1 0-28 0c0 10 14 26 14 26z"/><circle cx="32" cy="27" r="5"/>'
	)
};

/** Veeduría: un visto bueno. Índigo, para que no se confunda con nada público. */
const VEEDURIA: Seccion = {
	nombre: 'Veeduría',
	color: '#3730a3',
	icono: svg('#3730a3', '#c7d2fe', '<path d="M16 33l11 12 21-24"/>')
};

export function seccionDe(ruta: string): Seccion {
	if (ruta.startsWith('/veeduria')) return VEEDURIA;
	if (ruta.startsWith('/mi-lugar')) return MI_LUGAR;
	return PUBLICA;
}

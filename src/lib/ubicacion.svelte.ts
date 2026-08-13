import { browser } from '$app/environment';

/**
 * La ubicación de quien consulta, para poder decir "hay un acopio a 900 m" en
 * vez de obligarlo a leer treinta direcciones y adivinar cuál le queda cerca.
 *
 * Vive solo en el navegador y a propósito: no se manda al servidor, no se
 * guarda en la base y no entra en ningún registro. Se queda en `sessionStorage`
 * para que saltar de la lista al mapa y volver no vuelva a pedir permiso, y se
 * borra sola al cerrar la pestaña.
 */

const CLAVE = 'sismo:ubicacion';

export type EstadoUbicacion = 'inactiva' | 'pidiendo' | 'lista' | 'negada' | 'fallo';

type Punto = { lat: number; lng: number };

function leerGuardada(): Punto | null {
	if (!browser) return null;
	try {
		const crudo = sessionStorage.getItem(CLAVE);
		if (!crudo) return null;
		const punto = JSON.parse(crudo) as Punto;
		return Number.isFinite(punto?.lat) && Number.isFinite(punto?.lng) ? punto : null;
	} catch {
		return null;
	}
}

const inicial = leerGuardada();

let punto = $state<Punto | null>(inicial);
let estado = $state<EstadoUbicacion>(inicial ? 'lista' : 'inactiva');

export const ubicacion = {
	get punto() {
		return punto;
	},
	get estado() {
		return estado;
	},

	pedir() {
		if (!browser || !navigator.geolocation) {
			estado = 'fallo';
			return;
		}

		estado = 'pidiendo';
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				punto = { lat: pos.coords.latitude, lng: pos.coords.longitude };
				estado = 'lista';
				try {
					sessionStorage.setItem(CLAVE, JSON.stringify(punto));
				} catch {
					// Modo privado o storage lleno: la ubicación sigue sirviendo en esta
					// pantalla, solo no sobrevive a la siguiente. No es un error que
					// valga la pena mostrarle a nadie.
				}
			},
			(err) => {
				estado = err.code === err.PERMISSION_DENIED ? 'negada' : 'fallo';
			},
			// Precisión media: para ordenar una lista sobran 100 m, y pedir GPS fino
			// gasta batería y demora justo cuando la gente tiene afán.
			{ enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
		);
	},

	olvidar() {
		punto = null;
		estado = 'inactiva';
		if (browser) sessionStorage.removeItem(CLAVE);
	}
};

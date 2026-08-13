/**
 * "hace 20 min". En emergencia la frescura del dato es tan importante como el
 * dato, así que esto va visible en cada tarjeta.
 */
export function haceCuanto(iso: string, ahora = Date.now()): string {
	const minutos = Math.floor((ahora - Date.parse(iso)) / 60000);

	if (!Number.isFinite(minutos)) return '';
	if (minutos < 1) return 'recién';
	if (minutos < 60) return `hace ${minutos} min`;

	const horas = Math.floor(minutos / 60);
	if (horas < 24) return `hace ${horas} h`;

	const dias = Math.floor(horas / 24);
	return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
}

/**
 * "actualizado hace 20 min". La palabra importa: sin ella, un "hace 3 h"
 * suelto en la tarjeta se lee como el horario del sitio y no como la edad
 * del dato, que es lo que decide si uno confía o llama antes de salir.
 */
export function actualizadoHace(iso: string, ahora = Date.now()): string {
	const cuanto = haceCuanto(iso, ahora);
	return cuanto ? `actualizado ${cuanto}` : '';
}

/** Un dato de más de 12 h en una emergencia ya no es confiable. */
export function estaViejo(iso: string, ahora = Date.now()): boolean {
	return ahora - Date.parse(iso) > 12 * 3600_000;
}

/** Los campos de ubicación fina, en el orden en que se dicen en Colombia. */
type Detalle = {
	edificio?: string | null;
	torre?: string | null;
	piso?: string | null;
	apartamento?: string | null;
	barrio?: string | null;
};

/**
 * "Conjunto El Portal, Torre B, piso 3, apto 402 — barrio Chapinero".
 *
 * Se arma acá y no se guarda armado: quien registró puso cada dato en su
 * casilla, y así el mismo lugar se puede mostrar corto en una tarjeta y
 * completo en el detalle sin volver a pedirle nada.
 */
export function detalleUbicacion(lugar: Detalle): string {
	const partes = [
		lugar.edificio,
		lugar.torre && `Torre ${lugar.torre}`,
		lugar.piso && `piso ${lugar.piso}`,
		lugar.apartamento && `apto/local ${lugar.apartamento}`
	].filter((p): p is string => Boolean(p && String(p).trim()));

	const linea = partes.join(', ');
	const barrio = lugar.barrio?.trim();

	if (linea && barrio) return `${linea} — barrio ${barrio}`;
	if (barrio) return `Barrio ${barrio}`;
	return linea;
}

export function linkMapa(lugar: { lat: number | null; lng: number | null; direccion: string; ciudad: string }): string {
	if (lugar.lat !== null && lugar.lng !== null) {
		return `https://www.google.com/maps/search/?api=1&query=${lugar.lat},${lugar.lng}`;
	}
	const consulta = encodeURIComponent(`${lugar.direccion}, ${lugar.ciudad}, Colombia`);
	return `https://www.google.com/maps/search/?api=1&query=${consulta}`;
}

/**
 * Distancia en línea recta, en kilómetros. No es la distancia de manejo, y no
 * pretende serlo: sirve para ordenar y para decir "hay uno a 900 m", que es la
 * decisión que se toma parado en la puerta con una caja en la mano.
 */
export function distanciaKm(
	a: { lat: number; lng: number },
	b: { lat: number | null; lng: number | null }
): number | null {
	if (b.lat === null || b.lng === null) return null;

	const R = 6371;
	const rad = (g: number) => (g * Math.PI) / 180;
	const dLat = rad(b.lat - a.lat);
	const dLng = rad(b.lng - a.lng);
	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
}

/** "900 m", "2,4 km", "17 km". Nunca decimales que nadie va a usar. */
export function formatoDistancia(km: number): string {
	if (km < 1) return `${Math.round(km * 1000)} m`;
	if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
	return `${Math.round(km)} km`;
}

export function linkWhatsapp(numero: string): string | null {
	const digitos = numero.replace(/\D/g, '');
	if (digitos.length < 7) return null;
	const conPais = digitos.length === 10 ? `57${digitos}` : digitos;
	return `https://wa.me/${conPais}`;
}

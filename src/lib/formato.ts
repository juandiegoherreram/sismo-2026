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

/** Un dato de más de 12 h en una emergencia ya no es confiable. */
export function estaViejo(iso: string, ahora = Date.now()): boolean {
	return ahora - Date.parse(iso) > 12 * 3600_000;
}

export function linkMapa(lugar: { lat: number | null; lng: number | null; direccion: string; ciudad: string }): string {
	if (lugar.lat !== null && lugar.lng !== null) {
		return `https://www.google.com/maps/search/?api=1&query=${lugar.lat},${lugar.lng}`;
	}
	const consulta = encodeURIComponent(`${lugar.direccion}, ${lugar.ciudad}, Colombia`);
	return `https://www.google.com/maps/search/?api=1&query=${consulta}`;
}

export function linkWhatsapp(numero: string): string | null {
	const digitos = numero.replace(/\D/g, '');
	if (digitos.length < 7) return null;
	const conPais = digitos.length === 10 ? `57${digitos}` : digitos;
	return `https://wa.me/${conPais}`;
}

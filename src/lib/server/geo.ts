/**
 * Búsqueda de direcciones y geocodificación inversa contra Photon (el
 * buscador de Komoot sobre datos de OpenStreetMap).
 *
 * Va por el servidor y no desde el navegador por tres razones: la IP de cada
 * persona no se le entrega a un tercero, el límite de peticiones se controla
 * en un solo punto, y si algún día se cambia de proveedor no hay que tocar la
 * interfaz. Si el servicio se cae, el mapa sigue funcionando a punta de toque:
 * la búsqueda es una comodidad, nunca un requisito para registrar.
 */

/** Recuadro de Colombia: sesga los resultados sin excluir del todo. */
const BBOX = '-79.1,-4.3,-66.8,13.6';
const CENTRO = { lat: 4.6482, lon: -74.0776 };

const TIMEOUT_MS = 4000;

/**
 * Photon solo acepta default, de, en y fr — con `lang=es` responde 400 y la
 * búsqueda queda muerta en silencio. `default` devuelve el nombre local, que
 * en Colombia ya viene en español ("Parque Metropolitano Simón Bolívar").
 */
const LANG = 'default';

export interface Sugerencia {
	/** Línea principal, lista para el campo de dirección. */
	direccion: string;
	barrio: string | null;
	ciudad: string | null;
	departamento: string | null;
	lat: number;
	lng: number;
	/** Lo que se muestra en la lista de resultados. */
	descripcion: string;
}

interface PropsPhoton {
	name?: string;
	street?: string;
	housenumber?: string;
	district?: string;
	suburb?: string;
	locality?: string;
	city?: string;
	town?: string;
	village?: string;
	county?: string;
	state?: string;
	countrycode?: string;
}

interface RasgoPhoton {
	geometry?: { coordinates?: [number, number] };
	properties?: PropsPhoton;
}

function armarDireccion(p: PropsPhoton): string {
	// "Carrera 30 57-40" — en Colombia la nomenclatura viene en `street` y el
	// número en `housenumber`; si no hay calle, el nombre del sitio sirve igual.
	const calle = [p.street, p.housenumber].filter(Boolean).join(' ');
	return calle || p.name || '';
}

function convertir(rasgo: RasgoPhoton): Sugerencia | null {
	const p = rasgo.properties;
	const coords = rasgo.geometry?.coordinates;
	if (!p || !coords || coords.length < 2) return null;

	const direccion = armarDireccion(p);
	if (!direccion) return null;

	const ciudad = p.city ?? p.town ?? p.village ?? p.county ?? null;

	// `district` en Bogotá es la localidad ("Localidad Teusaquillo"), que no es
	// un barrio y no le sirve a nadie para llegar. Se prefieren los campos más
	// finos, y si solo queda la localidad se descarta: mejor el campo vacío que
	// un dato que parece un barrio y no lo es. Igual sigue en `descripcion`,
	// donde sí ayuda a reconocer cuál de los resultados es el correcto.
	const crudo = p.suburb ?? p.locality ?? p.district ?? null;
	const barrio = crudo && /^localidad\b/i.test(crudo.trim()) ? null : crudo;

	// El nombre del sitio ("Parroquia San José") vale más que la calle para
	// reconocer el resultado correcto, así que va de primero cuando existe.
	const descripcion = [p.name && p.name !== direccion ? p.name : null, direccion, crudo, ciudad]
		.filter(Boolean)
		.join(' · ');

	return {
		direccion,
		barrio,
		ciudad,
		departamento: p.state ?? null,
		lng: coords[0],
		lat: coords[1],
		descripcion
	};
}

async function pedir(url: string): Promise<unknown> {
	// Sin timeout, un proveedor lento deja colgado el formulario de quien está
	// registrando en medio de una emergencia.
	const corte = AbortSignal.timeout(TIMEOUT_MS);
	const res = await fetch(url, {
		signal: corte,
		headers: { 'user-agent': 'sismo-2026/1.0 (directorio de acopio)' }
	});
	if (!res.ok) throw new Error(`geo ${res.status}`);
	return res.json();
}

function extraer(datos: unknown): Sugerencia[] {
	const rasgos = (datos as { features?: RasgoPhoton[] })?.features ?? [];
	return rasgos
		.filter((r) => !r.properties?.countrycode || r.properties.countrycode === 'CO')
		.map(convertir)
		.filter((s): s is Sugerencia => s !== null);
}

export async function buscarDireccion(consulta: string): Promise<Sugerencia[]> {
	const q = consulta.trim();
	if (q.length < 3) return [];

	const url =
		`https://photon.komoot.io/api?q=${encodeURIComponent(q)}` +
		`&limit=6&lang=${LANG}&bbox=${BBOX}&lat=${CENTRO.lat}&lon=${CENTRO.lon}`;

	try {
		return extraer(await pedir(url)).slice(0, 6);
	} catch (e) {
		console.error('[geo] buscar:', e);
		return [];
	}
}

/** Para el botón "usar mi ubicación": del punto GPS salen ciudad y barrio. */
export async function ubicacionInversa(lat: number, lng: number): Promise<Sugerencia | null> {
	const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=${LANG}&limit=1`;

	try {
		const [primera] = extraer(await pedir(url));
		// Se respeta el punto que dio el GPS, no el centro del resultado: es más
		// preciso que la calle que el geocodificador haya escogido como cercana.
		return primera ? { ...primera, lat, lng } : null;
	} catch (e) {
		console.error('[geo] inversa:', e);
		return null;
	}
}

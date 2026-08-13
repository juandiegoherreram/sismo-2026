import type { EtiquetaNecesidad } from './types';

/**
 * Adivina la categoría de un ítem escrito a mano ("pañales talla 2",
 * "acetaminofén x 20") para que entre en los filtros públicos sin obligar a
 * nadie a clasificar nada mientras hay gente esperando.
 *
 * Es deliberadamente una lista de palabras y no algo más listo: se corre igual
 * en el navegador y en el servidor, se lee de un vistazo y cualquiera del
 * equipo puede agregarle un término a las 3 de la mañana. Siempre es una
 * sugerencia: quien escribe puede corregirla, y su corrección manda.
 */

/**
 * Sin tildes ni mayúsculas: en el celular medio mundo escribe "panales".
 * NFD parte cada letra acentuada en letra + marca, y la marca se descarta —
 * eso incluye la ñ, que queda en n. Por eso abajo las claves se escriben ya
 * normalizadas ("panal", no "pañal"): si no, nunca empatarían.
 */
function normalizar(texto: string): string {
	return texto
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, ' ');
}

/**
 * Se recorren en este orden y gana la primera que coincida, así que lo más
 * específico va primero: "leche de fórmula" es comida, pero "suero oral" es
 * medicamento aunque suene a bebida.
 */
const CLAVES: { categoria: EtiquetaNecesidad; palabras: string[] }[] = [
	{
		categoria: 'medicamentos',
		palabras: [
			'medicament', 'medicin', 'droga', 'farmac', 'botiquin', 'suero', 'acetaminofen',
			'ibuprofeno', 'analgesic', 'antibiotic', 'gasa', 'venda', 'curita', 'alcohol',
			'yodo', 'isodine', 'jeringa', 'insulina', 'inhalador', 'pastilla', 'antigrip',
			'antidiarreic', 'guantes de latex', 'tapabocas', 'mascarilla', 'sal de rehidrat'
		]
	},
	{
		categoria: 'agua',
		palabras: [
			'agua', 'hidrat', 'botellon', 'garrafa', 'termo', 'bolsa de agua', 'purificad',
			'tanque', 'gatorade', 'suero oral', 'bebida'
		]
	},
	{
		categoria: 'aseo',
		palabras: [
			'aseo', 'jabon', 'shampoo', 'champu', 'cepillo', 'crema dental', 'dentifric',
			'papel higienic', 'toalla higienic', 'toallas femenin', 'panal',
			'desodorante', 'detergente', 'cloro', 'limpiador', 'trapero', 'escoba',
			'bolsa de basura', 'higien', 'pasta de dientes', 'talco', 'afeitar'
		]
	},
	{
		categoria: 'comida',
		palabras: [
			'comida', 'alimento', 'mercado', 'arroz', 'panela', 'atun', 'enlatad', 'lenteja',
			'frijol', 'pasta', 'aceite', 'azucar', 'sal', 'harina', 'avena', 'galleta',
			'leche', 'formula', 'chocolate', 'cafe', 'pan', 'papa', 'platano', 'verdura',
			'fruta', 'huevo', 'sopa', 'cereal', 'compota', 'bienestarina', 'almuerzo',
			'desayuno', 'refrigerio', 'olla', 'concentrado', 'comida para perro',
			'comida para gato', 'mascota'
		]
	},
	{
		categoria: 'ropa',
		palabras: [
			'ropa', 'camisa', 'camiset', 'pantalon', 'chaqueta', 'saco', 'buzo', 'abrigo',
			'zapato', 'tenis', 'bota', 'media', 'ropa interior', 'cobija', 'manta', 'sabana',
			'almohada', 'colchon', 'colchonet', 'toalla', 'gorra', 'sombrero', 'impermeable'
		]
	},
	{
		categoria: 'herramientas',
		palabras: [
			'herramient', 'pala', 'pica', 'carretilla', 'martillo', 'clavo', 'alambre',
			'cuerda', 'lazo', 'linterna', 'pila', 'bateria', 'planta electric', 'generador',
			'extension', 'cable', 'guante', 'casco', 'lona', 'plastico', 'carpa', 'tienda',
			'motosierra', 'escalera', 'balde', 'costal', 'cinta', 'machete', 'andamio'
		]
	},
	{
		categoria: 'transporte',
		palabras: [
			'transport', 'camion', 'camionet', 'furgon', 'moto', 'carro', 'vehicul',
			'conductor', 'gasolina', 'combustible', 'acpm', 'flete', 'domicilio', 'recoger',
			'traslad', 'ambulancia', 'grua'
		]
	},
	{
		categoria: 'voluntarios',
		palabras: [
			'voluntari', 'gente', 'manos', 'ayudant', 'personal', 'brigadist', 'medico',
			'enfermer', 'psicolog', 'ingenier', 'cociner', 'traductor', 'turno', 'apoyo',
			'clasificar', 'empacar', 'descargar', 'cargar', 'digitador', 'logistic'
		]
	}
];

export function adivinarCategoria(texto: string): EtiquetaNecesidad | null {
	const limpio = normalizar(texto);
	if (!limpio.trim()) return null;

	for (const { categoria, palabras } of CLAVES) {
		if (palabras.some((palabra) => limpio.includes(palabra))) return categoria;
	}
	return null;
}

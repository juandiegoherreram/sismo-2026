<script lang="ts">
	import { untrack } from 'svelte';
	import BuscadorDireccion from './BuscadorDireccion.svelte';
	import ListaItems from './ListaItems.svelte';
	import Mapa from './Mapa.svelte';
	import { NECESIDADES, NIVEL_POR_VALOR, TIPOS, siguienteNivel } from '$lib/constantes';
	import type {
		EtiquetaNecesidad,
		ItemNuevo,
		LugarConNecesidades,
		Necesidad,
		NivelNecesidad,
		TipoLugar
	} from '$lib/types';

	let {
		lugar = null,
		enviando = false,
		onguardar
	}: {
		lugar?: LugarConNecesidades | null;
		enviando?: boolean;
		onguardar: (datos: Record<string, unknown>) => void;
	} = $props();

	// El formulario copia el lugar a estado editable una sola vez, a propósito:
	// mientras alguien escribe, un refresco de datos no debe pisarle el texto.
	// Quien lo usa lo remonta con {#key} cuando de verdad cambió el lugar.
	const inicial = untrack(() => lugar);

	// Registrar es un trámite de una vez y se hace por pasos, para no enfrentar
	// a nadie con una pantalla de treinta campos. Editar es volver a tocar una
	// cosa suelta: ahí estorbaría, y se muestra todo junto.
	const porPasos = inicial === null;

	let nombre = $state(inicial?.nombre ?? '');
	let tipo = $state<TipoLugar>(inicial?.tipo ?? 'acopio');
	let ciudad = $state(inicial?.ciudad ?? '');
	let departamento = $state(inicial?.departamento ?? '');
	let direccion = $state(inicial?.direccion ?? '');
	let barrio = $state(inicial?.barrio ?? '');
	let edificio = $state(inicial?.edificio ?? '');
	let torre = $state(inicial?.torre ?? '');
	let piso = $state(inicial?.piso ?? '');
	let apartamento = $state(inicial?.apartamento ?? '');
	let referencia = $state(inicial?.referencia ?? '');
	let horario = $state(inicial?.horario ?? '');
	let contacto = $state(inicial?.contacto_publico ?? '');
	let textoLibre = $state(inicial?.texto_libre ?? '');
	let lat = $state<number | null>(inicial?.lat ?? null);
	let lng = $state<number | null>(inicial?.lng ?? null);

	let items = $state<ItemNuevo[]>(
		(inicial?.items ?? []).map(({ texto, categoria, nivel }) => ({ texto, categoria, nivel }))
	);

	// Los detalles del edificio arrancan abiertos solo si ya hay alguno: para el
	// que registra por primera vez son ruido, y para el que vuelve son su dato.
	let verDetalles = $state(
		Boolean(inicial?.edificio || inicial?.torre || inicial?.piso || inicial?.apartamento)
	);

	// Un mapa etiqueta → nivel es más fácil de manejar en la UI que la lista.
	let niveles = $state<Partial<Record<EtiquetaNecesidad, NivelNecesidad>>>(
		Object.fromEntries((inicial?.necesidades ?? []).map((n) => [n.etiqueta, n.nivel]))
	);

	function ciclar(etiqueta: EtiquetaNecesidad) {
		niveles = { ...niveles, [etiqueta]: siguienteNivel(niveles[etiqueta]) ?? undefined };
	}

	// Los pasos se explican en una línea corta. Los campos, con su etiqueta y su
	// ejemplo: una instrucción larga debajo de cada caja se lee como una regla y
	// hace dudar a quien iba a escribir lo correcto.
	const PASOS = [
		{ titulo: 'El lugar', ayuda: 'Nombre, tipo y horario.' },
		{ titulo: 'Dónde queda', ayuda: 'Sin dirección nadie llega.' },
		{ titulo: 'Qué necesitan', ayuda: 'Esto se puede cambiar después, cuando quiera.' },
		{ titulo: 'Mensaje', ayuda: 'Lo que la gente deba saber antes de ir.' }
	];

	let paso = $state(0);
	let reclamo = $state('');

	/**
	 * Validación propia y no solo `required`: en modo pasos los campos de otros
	 * pasos no están montados, así que el navegador no los ve y dejaría pasar un
	 * lugar sin dirección — que es justo el dato que hace inútil el registro.
	 */
	function faltaEn(indice: number): string {
		if (indice === 0) {
			if (nombre.trim().length < 3) return 'Escriba el nombre del lugar (mínimo 3 letras).';
		}
		if (indice === 1) {
			if (direccion.trim().length < 5) return 'La dirección es obligatoria: sin ella nadie llega.';
			if (!ciudad.trim()) return 'Falta la ciudad.';
			if (!departamento.trim()) return 'Falta el departamento.';
		}
		return '';
	}

	function irA(destino: number) {
		// Hacia atrás siempre se puede; hacia adelante, solo con lo anterior lleno.
		if (destino > paso) {
			for (let i = paso; i < destino; i++) {
				const falta = faltaEn(i);
				if (falta) {
					paso = i;
					reclamo = falta;
					return;
				}
			}
		}
		reclamo = '';
		paso = destino;
		if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	/**
	 * Lo que trae el buscador se usa para rellenar, nunca para pisar: si alguien
	 * ya escribió la ciudad a mano, su versión manda sobre la del geocodificador.
	 */
	function aplicarSugerencia(s: {
		direccion: string;
		barrio: string | null;
		ciudad: string | null;
		departamento: string | null;
		lat: number;
		lng: number;
	}) {
		if (s.direccion) direccion = s.direccion;
		if (s.barrio && !barrio.trim()) barrio = s.barrio;
		if (s.ciudad && !ciudad.trim()) ciudad = s.ciudad;
		if (s.departamento && !departamento.trim()) departamento = s.departamento;
		lat = s.lat;
		lng = s.lng;
		reclamo = '';
	}

	function enviar(e: SubmitEvent) {
		e.preventDefault();

		// Un Enter en cualquier campo dispara el submit: en modo pasos eso tiene
		// que ser "siguiente", no "guardar a medias".
		if (porPasos && paso < PASOS.length - 1) {
			irA(paso + 1);
			return;
		}

		for (let i = 0; i < PASOS.length; i++) {
			const falta = faltaEn(i);
			if (falta) {
				reclamo = falta;
				if (porPasos) paso = i;
				return;
			}
		}

		const necesidades: Necesidad[] = Object.entries(niveles)
			.filter(([, nivel]) => Boolean(nivel))
			.map(([etiqueta, nivel]) => ({ etiqueta: etiqueta as EtiquetaNecesidad, nivel: nivel! }));

		onguardar({
			nombre, tipo, ciudad, departamento, direccion,
			barrio, edificio, torre, piso, apartamento, referencia,
			horario, contacto_publico: contacto,
			texto_libre: textoLibre,
			lat, lng, necesidades, items,
			estado_operativo: inicial?.estado_operativo ?? 'estable'
		});
	}
</script>

{#snippet identidad()}
	<div class="space-y-4">
		<div>
			<label class="label" for="nombre">Nombre del lugar</label>
			<input id="nombre" class="input" bind:value={nombre} required minlength="3" maxlength="120"
				placeholder="Ej: Acopio Parroquia San José" />
		</div>

		<div>
			<span class="label">Tipo de lugar</span>
			<div class="grid grid-cols-2 gap-2">
				{#each TIPOS as opcion (opcion.valor)}
					<button
						type="button"
						class="flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition {tipo === opcion.valor
							? 'border-brand-700 bg-brand-50 text-brand-900'
							: 'border-stone-300 bg-white text-stone-700'}"
						onclick={() => (tipo = opcion.valor)}
					>
						<span class="text-lg" aria-hidden="true">{opcion.emoji}</span>
						{opcion.nombre}
					</button>
				{/each}
			</div>
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label" for="horario">Horario <span class="font-normal text-stone-500">(opcional)</span></label>
				<input id="horario" class="input" bind:value={horario} maxlength="120" placeholder="8am a 6pm, todos los días" />
			</div>
			<div>
				<label class="label" for="contacto">Contacto público <span class="font-normal text-stone-500">(opcional)</span></label>
				<input id="contacto" class="input" bind:value={contacto} maxlength="80" placeholder="300 123 4567" />
				<p class="mt-1 text-xs text-stone-500">Este número lo ve todo el mundo.</p>
			</div>
		</div>
	</div>
{/snippet}

{#snippet ubicacion()}
	<div class="space-y-4">
		<div>
			<span class="label">Buscar la dirección</span>
			<BuscadorDireccion onelegir={aplicarSugerencia} />
		</div>

		<div>
			<label class="label" for="direccion">Dirección</label>
			<input id="direccion" class="input" bind:value={direccion} required minlength="5" maxlength="200"
				placeholder="Cra 30 # 57-40" />
		</div>

		<div class="grid gap-3 sm:grid-cols-3">
			<div>
				<label class="label" for="ciudad">Ciudad</label>
				<input id="ciudad" class="input" bind:value={ciudad} required maxlength="80" placeholder="Bogotá" />
			</div>
			<div>
				<label class="label" for="departamento">Departamento</label>
				<input id="departamento" class="input" bind:value={departamento} required maxlength="80"
					placeholder="Cundinamarca" />
			</div>
			<div>
				<label class="label" for="barrio">Barrio <span class="font-normal text-stone-500">(opcional)</span></label>
				<input id="barrio" class="input" bind:value={barrio} maxlength="80" placeholder="Chapinero Alto" />
			</div>
		</div>

		<!--
		  Estos campos son nuestros, no salen de ningún geocodificador: un acopio
		  en la torre B de un conjunto no lo encuentra Maps, y sin esto la gente
		  llega a la portería y no sabe para dónde coger.
		-->
		<div>
			<button type="button" class="text-sm font-semibold text-brand-700 underline"
				onclick={() => (verDetalles = !verDetalles)}>
				{verDetalles ? 'Ocultar' : 'Agregar'} detalles del edificio
			</button>

			{#if verDetalles}
				<div class="mt-3 space-y-3">
					<div>
						<label class="label" for="edificio">Edificio, conjunto o sede</label>
						<input id="edificio" class="input" bind:value={edificio} maxlength="80"
							placeholder="Conjunto El Portal / Colegio San José" />
					</div>
					<div class="grid grid-cols-3 gap-2">
						<div>
							<label class="label" for="torre">Torre</label>
							<input id="torre" class="input" bind:value={torre} maxlength="30" placeholder="B" />
						</div>
						<div>
							<label class="label" for="piso">Piso</label>
							<input id="piso" class="input" bind:value={piso} maxlength="20" placeholder="3" />
						</div>
						<div>
							<label class="label" for="apartamento">Apto / local</label>
							<input id="apartamento" class="input" bind:value={apartamento} maxlength="30" placeholder="402" />
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div>
			<label class="label" for="referencia">Cómo llegar <span class="font-normal text-stone-500">(opcional)</span></label>
			<input id="referencia" class="input" bind:value={referencia} maxlength="200"
				placeholder="Portería norte, al lado de la caseta" />
		</div>

		<div>
			<span class="label">Punto en el mapa <span class="font-normal text-stone-500">(opcional)</span></span>
			<Mapa seleccionable bind:lat bind:lng alto="h-64" />
		</div>
	</div>
{/snippet}

{#snippet necesidades()}
	<div class="space-y-5">
		<div>
			<span class="label">Por categoría</span>
			<p class="mb-2 text-sm text-stone-500">Toque para marcar: recibiendo, urgente, ya no.</p>
			<div class="flex flex-wrap gap-2">
				{#each NECESIDADES as necesidad (necesidad.valor)}
					{@const nivel = niveles[necesidad.valor]}
					{@const info = nivel ? NIVEL_POR_VALOR.get(nivel) : undefined}
					<button
						type="button"
						class="chip {info ? info.clase : 'chip-off'}"
						aria-label="{necesidad.nombre}: {info?.nombre ?? 'sin marcar'}. Toque para cambiar."
						onclick={() => ciclar(necesidad.valor)}
					>
						{#if info}<span class="h-2 w-2 rounded-full {info.punto}"></span>{/if}
						<span aria-hidden="true">{necesidad.emoji}</span>
						{necesidad.nombre}
						{#if info}<span class="font-bold">· {info.corto}</span>{/if}
					</button>
				{/each}
			</div>
		</div>

		<div>
			<span class="label">Lista de cosas puntuales</span>
			<p class="mb-2 text-sm text-stone-500">Lo específico que hace falta.</p>
			<ListaItems bind:items />
		</div>
	</div>
{/snippet}

<!--
  Un solo campo de texto y no dos. Antes había también una "nota corta" para la
  tarjeta de la lista, y obligaba a decidir qué decir en 140 caracteres y qué en
  el párrafo largo — una decisión que no le importa a nadie más y que en la
  práctica terminaba con el mismo texto escrito dos veces.
-->
{#snippet mensaje()}
	<div>
		<label class="label" for="texto-libre">
			Mensaje del lugar <span class="font-normal text-stone-500">(opcional)</span>
		</label>
		<p class="mb-2 text-sm text-stone-500">Lo que la gente deba saber antes de ir.</p>
		<textarea id="texto-libre" class="input" bind:value={textoLibre} maxlength="2000" rows="6"
			placeholder={'Recibimos de 7am a 7pm.\nNo estamos recibiendo ropa usada.\nSi trae mercado, mejor en cajas selladas.'}
		></textarea>
		<p class="mt-1 text-xs text-stone-500">{textoLibre.length}/2000</p>
	</div>
{/snippet}

<form onsubmit={enviar}>
	{#if porPasos}
		<div class="mb-5">
			<div class="flex gap-1.5">
				{#each PASOS as _, i (i)}
					<span class="h-1.5 flex-1 rounded-full {i <= paso ? 'bg-brand-600' : 'bg-stone-200'}"></span>
				{/each}
			</div>
			<p class="mt-2 text-xs font-semibold tracking-wide text-brand-700 uppercase">
				Paso {paso + 1} de {PASOS.length}
			</p>
			<h2 class="text-xl font-bold tracking-tight text-stone-900">{PASOS[paso].titulo}</h2>
			<p class="mt-0.5 text-sm text-stone-600">{PASOS[paso].ayuda}</p>
		</div>

		{#if paso === 0}{@render identidad()}{/if}
		{#if paso === 1}{@render ubicacion()}{/if}
		{#if paso === 2}{@render necesidades()}{/if}
		{#if paso === 3}{@render mensaje()}{/if}

		{#if reclamo}
			<p class="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">
				{reclamo}
			</p>
		{/if}

		<div class="mt-6 flex gap-2">
			{#if paso > 0}
				<button type="button" class="btn-secondary" onclick={() => irA(paso - 1)}>Atrás</button>
			{/if}
			{#if paso < PASOS.length - 1}
				<button type="button" class="btn-primary flex-1" onclick={() => irA(paso + 1)}>Siguiente</button>
			{:else}
				<button type="submit" class="btn-primary flex-1" disabled={enviando}>
					{enviando ? 'Guardando…' : 'Registrar lugar'}
				</button>
			{/if}
		</div>
	{:else}
		<div class="space-y-6">
			{@render identidad()}

			<fieldset class="rounded-2xl border border-stone-200 bg-white p-4">
				<legend class="px-1 font-bold text-stone-900">¿Dónde queda?</legend>
				{@render ubicacion()}
			</fieldset>

			<fieldset class="rounded-2xl border border-stone-200 bg-white p-4">
				<legend class="px-1 font-bold text-stone-900">¿Qué necesitan?</legend>
				{@render necesidades()}
			</fieldset>

			{@render mensaje()}

			{#if reclamo}
				<p class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">
					{reclamo}
				</p>
			{/if}

			<button type="submit" class="btn-primary w-full" disabled={enviando}>
				{enviando ? 'Guardando…' : 'Guardar cambios'}
			</button>
		</div>
	{/if}
</form>

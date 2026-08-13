<script lang="ts">
	import { untrack } from 'svelte';
	import Mapa from './Mapa.svelte';
	import { NECESIDADES, NIVELES, TIPOS } from '$lib/constantes';
	import type { EtiquetaNecesidad, LugarConNecesidades, Necesidad, NivelNecesidad, TipoLugar } from '$lib/types';

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

	let nombre = $state(inicial?.nombre ?? '');
	let tipo = $state<TipoLugar>(inicial?.tipo ?? 'acopio');
	let ciudad = $state(inicial?.ciudad ?? '');
	let departamento = $state(inicial?.departamento ?? '');
	let direccion = $state(inicial?.direccion ?? '');
	let referencia = $state(inicial?.referencia ?? '');
	let horario = $state(inicial?.horario ?? '');
	let contacto = $state(inicial?.contacto_publico ?? '');
	let nota = $state(inicial?.nota ?? '');
	let lat = $state<number | null>(inicial?.lat ?? null);
	let lng = $state<number | null>(inicial?.lng ?? null);

	// Un mapa etiqueta → nivel es más fácil de manejar en la UI que la lista.
	let niveles = $state<Partial<Record<EtiquetaNecesidad, NivelNecesidad>>>(
		Object.fromEntries((inicial?.necesidades ?? []).map((n) => [n.etiqueta, n.nivel]))
	);

	function ciclar(etiqueta: EtiquetaNecesidad) {
		const actual = niveles[etiqueta];
		const siguiente: Record<string, NivelNecesidad | undefined> = {
			undefined: 'urgente',
			urgente: 'recibiendo',
			recibiendo: 'no_recibir',
			no_recibir: undefined
		};
		niveles = { ...niveles, [etiqueta]: siguiente[String(actual)] };
	}

	function enviar(e: SubmitEvent) {
		e.preventDefault();
		const necesidades: Necesidad[] = Object.entries(niveles)
			.filter(([, nivel]) => Boolean(nivel))
			.map(([etiqueta, nivel]) => ({ etiqueta: etiqueta as EtiquetaNecesidad, nivel: nivel! }));

		onguardar({
			nombre, tipo, ciudad, departamento, direccion,
			referencia, horario, contacto_publico: contacto, nota,
			lat, lng, necesidades,
			estado_operativo: inicial?.estado_operativo ?? 'estable'
		});
	}
</script>

<form onsubmit={enviar} class="space-y-5">
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
					class="rounded-xl border-2 p-3 text-left text-sm font-semibold transition {tipo === opcion.valor
						? 'border-brand-700 bg-brand-50 text-brand-900'
						: 'border-stone-300 bg-white text-stone-700'}"
					onclick={() => (tipo = opcion.valor)}
				>
					<span class="text-lg" aria-hidden="true">{opcion.emoji}</span>
					<span class="mt-0.5 block">{opcion.nombre}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div>
			<label class="label" for="ciudad">Ciudad</label>
			<input id="ciudad" class="input" bind:value={ciudad} required maxlength="80" placeholder="Bogotá" />
		</div>
		<div>
			<label class="label" for="departamento">Departamento</label>
			<input id="departamento" class="input" bind:value={departamento} required maxlength="80"
				placeholder="Cundinamarca" />
		</div>
	</div>

	<div>
		<label class="label" for="direccion">Dirección</label>
		<input id="direccion" class="input" bind:value={direccion} required minlength="5" maxlength="200"
			placeholder="Cra 30 # 57-40" />
	</div>

	<div>
		<label class="label" for="referencia">Punto de referencia <span class="font-normal text-stone-500">(opcional)</span></label>
		<input id="referencia" class="input" bind:value={referencia} maxlength="200"
			placeholder="Portería norte, al lado de la caseta" />
	</div>

	<div>
		<span class="label">Ubicación en el mapa <span class="font-normal text-stone-500">(opcional, pero ayuda mucho)</span></span>
		<Mapa seleccionable bind:lat bind:lng alto="h-64" />
	</div>

	<div>
		<span class="label">Qué necesitan</span>
		<p class="mb-2 text-sm text-stone-500">Toque una vez para urgente, otra para recibiendo, otra para ya no recibimos.</p>
		<div class="flex flex-wrap gap-2">
			{#each NECESIDADES as necesidad (necesidad.valor)}
				{@const nivel = niveles[necesidad.valor]}
				{@const info = NIVELES.find((n) => n.valor === nivel)}
				<button
					type="button"
					class="chip {nivel ? info?.clase : 'chip-off'}"
					onclick={() => ciclar(necesidad.valor)}
				>
					<span aria-hidden="true">{necesidad.emoji}</span>
					{necesidad.nombre}
					{#if info}<span class="font-bold">· {info.nombre}</span>{/if}
				</button>
			{/each}
		</div>
	</div>

	<div>
		<label class="label" for="horario">Horario <span class="font-normal text-stone-500">(opcional)</span></label>
		<input id="horario" class="input" bind:value={horario} maxlength="120" placeholder="8am a 6pm, todos los días" />
	</div>

	<div>
		<label class="label" for="contacto">Contacto público <span class="font-normal text-stone-500">(opcional)</span></label>
		<input id="contacto" class="input" bind:value={contacto} maxlength="80" placeholder="300 123 4567" />
		<p class="mt-1 text-sm text-stone-500">Este número lo verá cualquiera. No ponga uno personal si no quiere llamadas.</p>
	</div>

	<div>
		<label class="label" for="nota">Nota corta <span class="font-normal text-stone-500">(opcional)</span></label>
		<textarea id="nota" class="input" bind:value={nota} maxlength="140" rows="2"
			placeholder="Ej: solo recibimos hasta las 6pm, no traer ropa usada"></textarea>
		<p class="mt-1 text-sm text-stone-500">{nota.length}/140</p>
	</div>

	<button type="submit" class="btn-primary w-full" disabled={enviando}>
		{enviando ? 'Guardando…' : lugar ? 'Guardar cambios' : 'Registrar lugar'}
	</button>
</form>

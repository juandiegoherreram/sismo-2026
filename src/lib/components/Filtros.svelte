<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { NECESIDADES, TIPOS } from '$lib/constantes';
	import type { Filtros } from '$lib/types';

	let {
		filtros,
		ciudades,
		base = '/'
	}: { filtros: Filtros; ciudades: string[]; base?: string } = $props();

	// Se lee de la URL y no de la prop: el input es el único filtro con estado
	// local, y así no se reinicia en cada navegación mientras se escribe.
	let busqueda = $state(page.url.searchParams.get('q') ?? '');

	/**
	 * Los filtros viven en la URL, no en estado local: así un link de WhatsApp
	 * puede llevar "acopios en Bogotá que necesitan agua" ya aplicado.
	 */
	function aplicar(cambios: Partial<Filtros>) {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [clave, valor] of Object.entries(cambios)) {
			if (valor) params.set(clave, valor);
			else params.delete(clave);
		}
		const query = params.toString();
		goto(query ? `${base}?${query}` : base, { keepFocus: true, noScroll: true });
	}

	function alternar(clave: keyof Filtros, valor: string) {
		aplicar({ [clave]: filtros[clave] === valor ? null : valor });
	}

	let temporizador: ReturnType<typeof setTimeout>;
	function buscarConPausa() {
		clearTimeout(temporizador);
		temporizador = setTimeout(() => aplicar({ q: busqueda.trim() || null }), 300);
	}

	const hayFiltros = $derived(Boolean(filtros.ciudad || filtros.tipo || filtros.necesidad || filtros.q));
</script>

<div class="space-y-3">
	<input
		class="input"
		type="search"
		placeholder="Buscar por nombre o dirección"
		bind:value={busqueda}
		oninput={buscarConPausa}
		aria-label="Buscar lugar"
	/>

	{#if ciudades.length > 1}
		<div class="flex gap-2 overflow-x-auto pb-1">
			{#each ciudades as ciudad (ciudad)}
				<button
					type="button"
					class="chip {filtros.ciudad === ciudad ? 'chip-on' : 'chip-off'}"
					onclick={() => alternar('ciudad', ciudad)}
				>
					{ciudad}
				</button>
			{/each}
		</div>
	{/if}

	<div class="flex gap-2 overflow-x-auto pb-1">
		{#each TIPOS as tipo (tipo.valor)}
			<button
				type="button"
				class="chip {filtros.tipo === tipo.valor ? 'chip-on' : 'chip-off'}"
				onclick={() => alternar('tipo', tipo.valor)}
			>
				<span aria-hidden="true">{tipo.emoji}</span>
				{tipo.plural}
			</button>
		{/each}
	</div>

	<div class="flex gap-2 overflow-x-auto pb-1">
		{#each NECESIDADES as necesidad (necesidad.valor)}
			<button
				type="button"
				class="chip {filtros.necesidad === necesidad.valor ? 'chip-on' : 'chip-off'}"
				onclick={() => alternar('necesidad', necesidad.valor)}
			>
				<span aria-hidden="true">{necesidad.emoji}</span>
				{necesidad.nombre}
			</button>
		{/each}
	</div>

	{#if hayFiltros}
		<button
			type="button"
			class="text-sm font-semibold text-brand-700 underline"
			onclick={() => {
				busqueda = '';
				aplicar({ ciudad: null, tipo: null, necesidad: null, q: null });
			}}
		>
			Quitar filtros
		</button>
	{/if}
</div>

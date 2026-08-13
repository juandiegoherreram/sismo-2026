<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { NECESIDADES, TIPOS } from '$lib/constantes';
	import { ubicacion } from '$lib/ubicacion.svelte';
	import type { EtiquetaNecesidad, Filtros, TipoLugar } from '$lib/types';

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
	 *
	 * `replaceState`: cada toque cambia la URL pero no apila una entrada más en
	 * el historial. Sin esto, alguien que escribió cinco letras en el buscador y
	 * abrió un lugar necesita seis toques de "atrás" para volver a su lista.
	 */
	function aplicar(cambios: Record<string, string | null>) {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [clave, valor] of Object.entries(cambios)) {
			if (valor) params.set(clave, valor);
			else params.delete(clave);
		}
		const query = params.toString();
		goto(query ? `${base}?${query}` : base, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	let temporizador: ReturnType<typeof setTimeout>;
	function buscarConPausa() {
		clearTimeout(temporizador);
		temporizador = setTimeout(() => aplicar({ q: busqueda.trim() || null }), 300);
	}

	/** Un toque prende, otro apaga. Sin ninguna prendida quiere decir "todas". */
	function alternarNecesidad(etiqueta: EtiquetaNecesidad) {
		const puestas = new Set(filtros.necesidades);
		if (puestas.has(etiqueta)) puestas.delete(etiqueta);
		else puestas.add(etiqueta);
		aplicar({ necesidad: [...puestas].join(',') || null });
	}

	const hayFiltros = $derived(
		Boolean(filtros.ciudad || filtros.tipo || filtros.necesidades.length || filtros.q)
	);
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

	<!--
	  Listas desplegables y no una fila que se corre de lado: en un carrusel las
	  opciones que no caben en pantalla no existen para quien no sabe que puede
	  arrastrar. Acá se ven todas de una, y en móvil las pinta el sistema.
	-->
	<div class="grid grid-cols-2 gap-2">
		{#if ciudades.length > 1}
			<div>
				<label class="mb-1 block text-xs font-semibold text-stone-500" for="filtro-ciudad">Ciudad</label>
				<select
					id="filtro-ciudad"
					class="input py-2.5"
					value={filtros.ciudad ?? ''}
					onchange={(e) => aplicar({ ciudad: e.currentTarget.value || null })}
				>
					<option value="">Todas</option>
					{#each ciudades as ciudad (ciudad)}
						<option value={ciudad}>{ciudad}</option>
					{/each}
				</select>
			</div>
		{/if}

		<div class={ciudades.length > 1 ? '' : 'col-span-2'}>
			<label class="mb-1 block text-xs font-semibold text-stone-500" for="filtro-tipo">Tipo de lugar</label>
			<select
				id="filtro-tipo"
				class="input py-2.5"
				value={filtros.tipo ?? ''}
				onchange={(e) => aplicar({ tipo: (e.currentTarget.value || null) as TipoLugar | null })}
			>
				<option value="">Todos</option>
				{#each TIPOS as tipo (tipo.valor)}
					<option value={tipo.valor}>{tipo.emoji} {tipo.plural}</option>
				{/each}
			</select>
		</div>
	</div>

	<!--
	  Chips y no una lista desplegable: acá sí se puede marcar más de una, y una
	  selección múltiple dentro de un <select> en móvil es de las cosas que menos
	  gente sabe usar. Marcadas varias, salen los puntos que reciban cualquiera.
	-->
	<div>
		<span class="mb-1.5 block text-xs font-semibold text-stone-500">
			Qué necesitan
			{#if filtros.necesidades.length}
				<span class="font-normal text-stone-400">· puede marcar varias</span>
			{/if}
		</span>
		<div class="flex flex-wrap gap-1.5">
			{#each NECESIDADES as necesidad (necesidad.valor)}
				{@const puesta = filtros.necesidades.includes(necesidad.valor)}
				<button
					type="button"
					class="chip px-3 py-1.5 {puesta ? 'chip-on' : 'chip-off'}"
					aria-pressed={puesta}
					onclick={() => alternarNecesidad(necesidad.valor)}
				>
					<span aria-hidden="true">{necesidad.emoji}</span>
					{necesidad.nombre}
				</button>
			{/each}
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
		<!--
		  La ubicación no sale del navegador. Es un botón y no algo automático
		  porque un permiso pedido de entrada, sin explicar para qué, casi
		  siempre se niega — y negado una vez es difícil de recuperar.
		-->
		{#if ubicacion.estado === 'lista'}
			<button
				type="button"
				class="text-sm font-semibold text-brand-700 underline"
				onclick={() => ubicacion.olvidar()}
			>
				📍 Usando su ubicación · quitar
			</button>
		{:else}
			<button
				type="button"
				class="text-sm font-semibold text-brand-700 underline"
				disabled={ubicacion.estado === 'pidiendo'}
				onclick={() => ubicacion.pedir()}
			>
				{ubicacion.estado === 'pidiendo' ? 'Buscando su ubicación…' : '📍 Ver lo más cerca de mí'}
			</button>
		{/if}

		{#if hayFiltros}
			<button
				type="button"
				class="text-sm font-semibold text-stone-600 underline"
				onclick={() => {
					busqueda = '';
					aplicar({ ciudad: null, tipo: null, necesidad: null, q: null });
				}}
			>
				Quitar filtros
			</button>
		{/if}
	</div>

	{#if ubicacion.estado === 'negada'}
		<p class="text-sm text-stone-500">
			El navegador no dio el permiso. Se puede volver a activar desde el candado de la barra de
			direcciones.
		</p>
	{:else if ubicacion.estado === 'fallo'}
		<p class="text-sm text-stone-500">No pudimos ubicarlo. Puede seguir buscando por ciudad o dirección.</p>
	{/if}
</div>

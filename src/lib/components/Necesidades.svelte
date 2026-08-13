<script lang="ts">
	import { NECESIDAD_POR_VALOR, NIVEL_POR_VALOR } from '$lib/constantes';
	import type { Necesidad } from '$lib/types';

	let {
		necesidades,
		mostrarNoRecibir = true
	}: { necesidades: Necesidad[]; mostrarNoRecibir?: boolean } = $props();

	// Urgente primero: es lo que decide qué mete alguien en el carro.
	const orden = { urgente: 0, recibiendo: 1, no_recibir: 2 };

	const visibles = $derived(
		necesidades
			.filter((n) => mostrarNoRecibir || n.nivel !== 'no_recibir')
			.sort((a, b) => orden[a.nivel] - orden[b.nivel])
	);
</script>

{#if visibles.length}
	<ul class="flex flex-wrap gap-1.5">
		{#each visibles as necesidad (necesidad.etiqueta)}
			{@const info = NECESIDAD_POR_VALOR.get(necesidad.etiqueta)}
			{@const nivel = NIVEL_POR_VALOR.get(necesidad.nivel)}
			<li class="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium {nivel?.clase}">
				<span aria-hidden="true">{info?.emoji}</span>
				{info?.nombre}
				{#if necesidad.nivel === 'urgente'}
					<span class="font-bold">· urgente</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

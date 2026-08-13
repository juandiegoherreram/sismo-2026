<script lang="ts">
	import BadgeEstado from './BadgeEstado.svelte';
	import Necesidades from './Necesidades.svelte';
	import { TIPO_POR_VALOR } from '$lib/constantes';
	import { estaViejo, haceCuanto } from '$lib/formato';
	import type { LugarConNecesidades } from '$lib/types';

	let { lugar }: { lugar: LugarConNecesidades } = $props();

	const tipo = $derived(TIPO_POR_VALOR.get(lugar.tipo));
	const viejo = $derived(estaViejo(lugar.actualizado_en));
	// Un sitio saturado o cerrado se atenúa: sigue visible, pero no compite.
	const apagado = $derived(lugar.estado_operativo === 'saturado' || lugar.estado_operativo === 'cerrado');
</script>

<a
	href="/lugar/{lugar.id}"
	class="card block p-4 transition hover:border-stone-300 hover:shadow-md {apagado ? 'opacity-70' : ''}"
>
	<div class="mb-2 flex items-start justify-between gap-3">
		<BadgeEstado estado={lugar.estado_operativo} />
		<span class="shrink-0 text-xs {viejo ? 'font-semibold text-amber-700' : 'text-stone-500'}">
			{haceCuanto(lugar.actualizado_en)}
		</span>
	</div>

	<h2 class="text-lg leading-tight font-bold text-stone-900">{lugar.nombre}</h2>

	<p class="mt-0.5 text-sm text-stone-600">
		<span aria-hidden="true">{tipo?.emoji}</span>
		{tipo?.nombre} · {lugar.ciudad}
	</p>

	{#if lugar.necesidades.length}
		<div class="mt-3">
			<Necesidades necesidades={lugar.necesidades} mostrarNoRecibir={false} />
		</div>
	{/if}

	{#if lugar.nota}
		<p class="mt-3 border-l-2 border-stone-300 pl-2.5 text-sm text-stone-700">{lugar.nota}</p>
	{/if}

	<p class="mt-3 text-sm text-stone-500">
		{lugar.direccion}{#if lugar.referencia}<span class="text-stone-400"> · {lugar.referencia}</span>{/if}
	</p>

	{#if lugar.horario}
		<p class="mt-1 text-sm text-stone-500">🕒 {lugar.horario}</p>
	{/if}
</a>

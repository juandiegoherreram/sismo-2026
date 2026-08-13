<script lang="ts">
	import Filtros from '$lib/components/Filtros.svelte';
	import Mapa from '$lib/components/Mapa.svelte';
	import { page } from '$app/state';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const conCoordenadas = $derived(data.lugares.filter((l) => l.lat !== null && l.lng !== null));
	const sinCoordenadas = $derived(data.lugares.length - conCoordenadas.length);
</script>

<svelte:head>
	<title>Mapa — Sismo 2026</title>
</svelte:head>

<main class="px-4 py-4">
	<Filtros filtros={data.filtros} ciudades={data.ciudades} base="/mapa" />

	<div class="mt-4">
		{#if conCoordenadas.length}
			<Mapa lugares={conCoordenadas} />
		{:else}
			<div class="card p-8 text-center">
				<p class="font-semibold text-stone-800">Ningún lugar con esos filtros tiene ubicación marcada</p>
				<p class="mt-1 text-sm text-stone-600">Revise la lista: ahí aparecen todos, con o sin mapa.</p>
			</div>
		{/if}
	</div>

	{#if sinCoordenadas > 0}
		<p class="mt-3 text-sm text-stone-500">
			{sinCoordenadas}
			{sinCoordenadas === 1 ? 'lugar no tiene' : 'lugares no tienen'} ubicación marcada y no {sinCoordenadas === 1
				? 'aparece'
				: 'aparecen'} en el mapa.
			<a class="font-semibold text-brand-700 underline" href="/{page.url.search}">Ver la lista completa</a>
		</p>
	{/if}
</main>

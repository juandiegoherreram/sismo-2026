<script lang="ts">
	import Filtros from '$lib/components/Filtros.svelte';
	import TarjetaLugar from '$lib/components/TarjetaLugar.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const necesitanGente = $derived(data.lugares.filter((l) => l.estado_operativo === 'necesita_gente'));
</script>

<svelte:head>
	<title>Sismo 2026 — Dónde ayudar y dónde donar</title>
	<meta
		name="description"
		content="Directorio en vivo de centros de acopio, donación de sangre, voluntariado y albergues. Mire cuáles necesitan gente ahora y cuáles ya están saturados."
	/>
</svelte:head>

<main class="px-4 py-4">
	<div class="mb-5">
		<h1 class="text-2xl font-bold tracking-tight text-stone-900">¿Dónde hace falta ayuda?</h1>
		<p class="mt-1 text-stone-600">
			{#if necesitanGente.length}
				<strong class="text-emerald-800">{necesitanGente.length}</strong>
				{necesitanGente.length === 1 ? 'punto necesita' : 'puntos necesitan'} gente o donaciones ahora mismo.
			{:else}
				Consulte antes de salir: los puntos saturados aparecen al final.
			{/if}
		</p>
	</div>

	<Filtros filtros={data.filtros} ciudades={data.ciudades} />

	<div class="mt-5 space-y-3">
		{#each data.lugares as lugar (lugar.id)}
			<TarjetaLugar {lugar} />
		{:else}
			<div class="card p-8 text-center">
				<p class="font-semibold text-stone-800">No hay lugares con esos filtros</p>
				<p class="mt-1 text-sm text-stone-600">
					Pruebe quitando alguno, o revise el mapa para ver qué hay cerca.
				</p>
			</div>
		{/each}
	</div>

	{#if data.lugares.length}
		<p class="mt-6 text-center text-sm text-stone-500">
			{data.lugares.length}
			{data.lugares.length === 1 ? 'lugar' : 'lugares'} en total
		</p>
	{/if}
</main>

<script lang="ts">
	import Filtros from '$lib/components/Filtros.svelte';
	import TarjetaLugar from '$lib/components/TarjetaLugar.svelte';
	import { NECESIDAD_POR_VALOR } from '$lib/constantes';
	import { distanciaKm } from '$lib/formato';
	import { ubicacion } from '$lib/ubicacion.svelte';
	import type { EtiquetaNecesidad } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let orden = $state<'urgencia' | 'cercania'>('urgencia');

	// Activar la ubicación es, en la práctica, pedir "muéstreme lo de acá cerca".
	// Se cambia el orden solo, y queda el chip para devolverse.
	$effect(() => {
		if (ubicacion.punto) orden = 'cercania';
		else orden = 'urgencia';
	});

	const necesitanGente = $derived(data.lugares.filter((l) => l.estado_operativo === 'necesita_gente'));
	const ciudadesActivas = $derived(new Set(necesitanGente.map((l) => l.ciudad)));

	/**
	 * Las tres cosas que más se están pidiendo con urgencia ahora mismo. Es la
	 * media frase que convierte "hay puntos que necesitan ayuda" en algo que se
	 * puede hacer: la gente sale de la casa con algo concreto en la mano.
	 */
	const masPedido = $derived.by(() => {
		const conteo = new Map<EtiquetaNecesidad, number>();
		for (const lugar of data.lugares) {
			const urgentes = new Set([
				...lugar.necesidades.filter((n) => n.nivel === 'urgente').map((n) => n.etiqueta),
				...lugar.items.filter((i) => i.nivel === 'urgente' && i.categoria).map((i) => i.categoria!)
			]);
			for (const etiqueta of urgentes) conteo.set(etiqueta, (conteo.get(etiqueta) ?? 0) + 1);
		}

		return [...conteo.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3)
			.map(([etiqueta]) => NECESIDAD_POR_VALOR.get(etiqueta)?.nombre.toLowerCase())
			.filter((n): n is string => Boolean(n));
	});

	/** Distancia de cada lugar, o null si no hay ubicación o el lugar no tiene punto. */
	const conDistancia = $derived(
		data.lugares.map((lugar) => ({
			lugar,
			distancia: ubicacion.punto ? distanciaKm(ubicacion.punto, lugar) : null
		}))
	);

	/**
	 * Ordenar por cercanía no borra la regla de fondo: un punto saturado o
	 * cerrado sigue yéndose al fondo aunque quede a la vuelta. Mandar gente a
	 * 200 m de donde ya no cabe nadie es exactamente lo que la app existe para
	 * evitar. Los que no tienen punto en el mapa van después de los que sí.
	 */
	const listados = $derived.by(() => {
		if (orden !== 'cercania' || !ubicacion.punto) return conDistancia;

		const alFondo = (estado: string) => (estado === 'saturado' || estado === 'cerrado' ? 1 : 0);

		return conDistancia.slice().sort((a, b) => {
			const porEstado = alFondo(a.lugar.estado_operativo) - alFondo(b.lugar.estado_operativo);
			if (porEstado !== 0) return porEstado;
			if (a.distancia === null) return b.distancia === null ? 0 : 1;
			if (b.distancia === null) return -1;
			return a.distancia - b.distancia;
		});
	});

	const sinUbicar = $derived(
		orden === 'cercania' ? listados.filter((l) => l.distancia === null).length : 0
	);
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
				{necesitanGente.length === 1 ? 'punto necesita' : 'puntos necesitan'} gente o donaciones ahora
				mismo{#if ciudadesActivas.size > 1}, en {ciudadesActivas.size} ciudades{:else if ciudadesActivas.size === 1}
					en {[...ciudadesActivas][0]}{/if}.
				{#if masPedido.length}
					Lo que más piden: <strong class="text-stone-800">{masPedido.join(', ')}</strong>.
				{/if}
			{:else}
				Consulte antes de salir: los puntos saturados aparecen al final.
			{/if}
		</p>
	</div>

	<Filtros filtros={data.filtros} ciudades={data.ciudades} />

	{#if ubicacion.punto}
		<div class="mt-4 flex flex-wrap items-center gap-2">
			<span class="text-xs font-semibold text-stone-500">Ordenar por</span>
			<button
				type="button"
				class="chip px-3 py-1.5 {orden === 'cercania' ? 'chip-on' : 'chip-off'}"
				onclick={() => (orden = 'cercania')}
			>
				Más cerca
			</button>
			<button
				type="button"
				class="chip px-3 py-1.5 {orden === 'urgencia' ? 'chip-on' : 'chip-off'}"
				onclick={() => (orden = 'urgencia')}
			>
				Más urgente
			</button>
		</div>
	{/if}

	<div class="mt-5 space-y-3">
		{#each listados as { lugar, distancia } (lugar.id)}
			<TarjetaLugar {lugar} {distancia} />
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
			{data.lugares.length === 1 ? 'lugar' : 'lugares'} en total{#if sinUbicar}
				· {sinUbicar} sin punto en el mapa, al final de la lista{/if}
		</p>
	{/if}
</main>

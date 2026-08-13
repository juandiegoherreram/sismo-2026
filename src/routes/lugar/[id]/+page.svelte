<script lang="ts">
	import BadgeEstado from '$lib/components/BadgeEstado.svelte';
	import Necesidades from '$lib/components/Necesidades.svelte';
	import ReportarDesactualizado from '$lib/components/ReportarDesactualizado.svelte';
	import { ESTADO_POR_VALOR, TIPO_POR_VALOR } from '$lib/constantes';
	import { estaViejo, haceCuanto, linkMapa, linkWhatsapp } from '$lib/formato';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const lugar = $derived(data.lugar);
	const tipo = $derived(TIPO_POR_VALOR.get(lugar.tipo));
	const estado = $derived(ESTADO_POR_VALOR.get(lugar.estado_operativo));
	const whatsapp = $derived(lugar.contacto_publico ? linkWhatsapp(lugar.contacto_publico) : null);
</script>

<svelte:head>
	<title>{lugar.nombre} — Sismo 2026</title>
	<meta name="description" content="{tipo?.nombre} en {lugar.ciudad}. {estado?.descripcion}" />
</svelte:head>

<main class="px-4 py-4">
	<a href="/" class="text-sm font-semibold text-brand-700">← Volver a la lista</a>

	<div class="mt-3 flex flex-wrap items-center gap-2">
		<BadgeEstado estado={lugar.estado_operativo} grande />
		<span class="text-sm {estaViejo(lugar.actualizado_en) ? 'font-semibold text-amber-700' : 'text-stone-500'}">
			actualizado {haceCuanto(lugar.actualizado_en)}
		</span>
	</div>

	<h1 class="mt-3 text-2xl font-bold tracking-tight text-stone-900">{lugar.nombre}</h1>
	<p class="mt-1 text-stone-600">
		<span aria-hidden="true">{tipo?.emoji}</span>
		{tipo?.nombre} · {lugar.ciudad}, {lugar.departamento}
	</p>

	{#if estado}
		<p class="mt-3 rounded-xl border p-3 text-sm font-medium {estado.clase}">{estado.descripcion}</p>
	{/if}

	{#if lugar.nota}
		<p class="mt-4 border-l-4 border-stone-300 pl-3 text-stone-800">{lugar.nota}</p>
	{/if}

	{#if lugar.necesidades.length}
		<section class="mt-6">
			<h2 class="mb-2 font-bold text-stone-900">Qué necesitan</h2>
			<Necesidades necesidades={lugar.necesidades} />
		</section>
	{/if}

	<section class="card mt-6 divide-y divide-stone-200">
		<div class="p-4">
			<h2 class="text-sm font-semibold text-stone-500">Dirección</h2>
			<p class="mt-0.5 text-stone-900">{lugar.direccion}</p>
			{#if lugar.referencia}
				<p class="mt-0.5 text-sm text-stone-600">{lugar.referencia}</p>
			{/if}
		</div>

		{#if lugar.horario}
			<div class="p-4">
				<h2 class="text-sm font-semibold text-stone-500">Horario</h2>
				<p class="mt-0.5 text-stone-900">{lugar.horario}</p>
			</div>
		{/if}

		{#if lugar.contacto_publico}
			<div class="p-4">
				<h2 class="text-sm font-semibold text-stone-500">Contacto</h2>
				<p class="mt-0.5 text-stone-900">{lugar.contacto_publico}</p>
			</div>
		{/if}
	</section>

	<div class="mt-4 grid gap-2 sm:grid-cols-2">
		<a class="btn-primary text-center" href={linkMapa(lugar)} target="_blank" rel="noopener">
			Cómo llegar
		</a>
		{#if whatsapp}
			<a class="btn-secondary text-center" href={whatsapp} target="_blank" rel="noopener">
				Escribir por WhatsApp
			</a>
		{/if}
	</div>

	<ReportarDesactualizado lugarId={lugar.id} />
</main>

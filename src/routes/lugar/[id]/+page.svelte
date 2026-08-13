<script lang="ts">
	import BadgeEstado from '$lib/components/BadgeEstado.svelte';
	import Mapa from '$lib/components/Mapa.svelte';
	import Necesidades from '$lib/components/Necesidades.svelte';
	import ReportarDesactualizado from '$lib/components/ReportarDesactualizado.svelte';
	import { ESTADO_POR_VALOR, TIPO_POR_VALOR } from '$lib/constantes';
	import {
		actualizadoHace,
		detalleUbicacion,
		distanciaKm,
		estaViejo,
		formatoDistancia,
		linkMapa,
		linkWhatsapp
	} from '$lib/formato';
	import { ubicacion } from '$lib/ubicacion.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const lugar = $derived(data.lugar);
	const tipo = $derived(TIPO_POR_VALOR.get(lugar.tipo));
	const estado = $derived(ESTADO_POR_VALOR.get(lugar.estado_operativo));
	const whatsapp = $derived(lugar.contacto_publico ? linkWhatsapp(lugar.contacto_publico) : null);
	const detalle = $derived(detalleUbicacion(lugar));
	const distancia = $derived(ubicacion.punto ? distanciaKm(ubicacion.punto, lugar) : null);
	const tieneMapa = $derived(lugar.lat !== null && lugar.lng !== null);

	// Lo urgente primero: es lo que decide qué mete alguien en el carro.
	const items = $derived(
		lugar.items
			.filter((i) => i.nivel !== 'no_recibir')
			.sort((a, b) => Number(b.nivel === 'urgente') - Number(a.nivel === 'urgente'))
	);
	const noReciben = $derived(lugar.items.filter((i) => i.nivel === 'no_recibir'));
</script>

<svelte:head>
	<title>{lugar.nombre} — Sismo 2026</title>
	<meta name="description" content="{tipo?.nombre} en {lugar.ciudad}. {estado?.descripcion}" />
</svelte:head>

<main class="px-4 py-4">
	<!--
	  Enlace normal del navegador hacia atrás: el botón «volver» del navegador y
	  este llevan al mismo sitio, la lista tal como quedó —filtros y scroll—
	  porque los filtros viven en la URL y no apilan historial.
	-->
	<a href="/" class="text-sm font-semibold text-brand-700">← Volver a la lista</a>

	<!-- ── Encabezado: quién es, cómo está y qué tan fresco es el dato ────── -->
	<h1 class="mt-3 text-xl leading-tight font-bold tracking-tight text-stone-900">{lugar.nombre}</h1>

	<div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
		<BadgeEstado estado={lugar.estado_operativo} />
		<span class="text-sm text-stone-600">
			<span aria-hidden="true">{tipo?.emoji}</span>
			{tipo?.nombre} · {lugar.ciudad}, {lugar.departamento}
		</span>
		{#if distancia !== null}
			<span class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-800">
				a {formatoDistancia(distancia)}
			</span>
		{/if}
	</div>

	<p class="mt-1 text-sm {estaViejo(lugar.actualizado_en) ? 'font-semibold text-amber-700' : 'text-stone-500'}">
		{actualizadoHace(lugar.actualizado_en)}
	</p>

	<!-- ── Qué necesitan: lo que la gente vino a leer ─────────────────────── -->
	{#if lugar.necesidades.length || items.length}
		<section class="mt-5">
			<h2 class="mb-2 font-bold text-stone-900">Qué necesitan</h2>
			<Necesidades necesidades={lugar.necesidades} />

			{#if items.length}
				<ul class="mt-3 space-y-1.5">
					{#each items as item (item.id)}
						<li class="flex items-start gap-2 text-stone-800">
							<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full {item.nivel === 'urgente'
								? 'bg-red-500'
								: 'bg-emerald-500'}"></span>
							<span>
								{item.texto}
								{#if item.nivel === 'urgente'}
									<span class="text-sm font-bold text-red-700">· urgente</span>
								{/if}
							</span>
						</li>
					{/each}
				</ul>
			{/if}

			{#if noReciben.length}
				<p class="mt-3 text-sm text-amber-800">
					<span class="font-semibold">Ya no reciben:</span>
					{noReciben.map((i) => i.texto).join(', ')}
				</p>
			{/if}
		</section>
	{/if}

	<!--
	  El texto del lugar va tal cual lo escribieron, sin encabezado que lo
	  presente: se ve que es su voz por la barra al margen, y un rótulo encima
	  solo gastaba un renglón para decir lo que ya se entiende. Svelte lo escapa,
	  así que no hay marcado que interpretar; `whitespace-pre-line` respeta los
	  saltos de línea, que es todo el formato que hace falta.
	-->
	{#if lugar.texto_libre}
		<p class="mt-5 border-l-4 border-stone-300 pl-3 whitespace-pre-line text-stone-800">
			{lugar.texto_libre}
		</p>
	{/if}

	<!-- ── Dónde queda ────────────────────────────────────────────────────── -->
	<section class="mt-6">
		<h2 class="mb-2 font-bold text-stone-900">Dónde queda</h2>

		<div class="card overflow-hidden">
			{#if tieneMapa}
				<!--
				  El recuadro del mapa no es para explorar: es para reconocer el sector
				  de un vistazo y salir hacia la app de navegación de un toque. Por eso
				  va fijo y entero dentro del enlace.
				-->
				<a
					href={linkMapa(lugar)}
					target="_blank"
					rel="noopener"
					class="block"
					aria-label="Abrir {lugar.nombre} en Google Maps"
				>
					<Mapa estatico lugares={[lugar]} alto="h-40" />
				</a>
			{/if}

			<div class="p-3.5">
				<p class="font-medium text-stone-900">{lugar.direccion}</p>
				{#if detalle}<p class="mt-0.5 text-sm text-stone-700">{detalle}</p>{/if}
				{#if lugar.referencia}<p class="mt-0.5 text-sm text-stone-600">{lugar.referencia}</p>{/if}

				<p class="mt-2 text-sm text-stone-600">
					{#if lugar.horario}🕒 {lugar.horario}{/if}
					{#if lugar.horario && lugar.contacto_publico}<span class="text-stone-300"> · </span>{/if}
					{#if lugar.contacto_publico}📞 {lugar.contacto_publico}{/if}
				</p>
			</div>
		</div>
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

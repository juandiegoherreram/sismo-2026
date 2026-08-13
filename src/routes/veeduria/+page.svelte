<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { ESTADO_POR_VALOR, MOTIVOS_REPORTE, TIPO_POR_VALOR } from '$lib/constantes';
	import { actualizadoHace, detalleUbicacion, haceCuanto } from '$lib/formato';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let pestana = $state<'cola' | 'publicados'>('cola');
	let fallo = $state('');
	let ocupado = $state('');
	// Qué lugar publicado tiene sus reportes desplegados.
	let abierto = $state('');

	const motivoNombre = Object.fromEntries(MOTIVOS_REPORTE.map((m) => [m.valor, m.nombre]));

	const pendientes = $derived(data.lugares.filter((l) => l.estado_moderacion === 'pendiente'));

	/**
	 * Publicados, con los reportados de primeros. Los reportes viven acá y no en
	 * una cola aparte: veeduría no atiende reportes uno por uno —eso le toca a
	 * quien maneja el lugar— sino que vigila qué lugares publicados están
	 * recibiendo señales de que su información ya no corresponde.
	 */
	const publicados = $derived(
		data.lugares
			.filter((l) => l.estado_moderacion === 'aprobado')
			.map((lugar) => ({ lugar, reportes: data.reportesPorLugar[lugar.id] ?? [] }))
			.sort((a, b) => b.reportes.length - a.reportes.length)
	);

	const conReportes = $derived(publicados.filter((p) => p.reportes.length).length);

	async function pedir(url: string, metodo: string, cuerpo: unknown) {
		const res = await fetch(url, {
			method: metodo,
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(cuerpo)
		});
		if (!res.ok) {
			const detalle = await res.json().catch(() => null);
			throw new Error(detalle?.message ?? 'No se pudo completar la acción');
		}
		return res.json();
	}

	async function moderar(id: string, accion: 'aprobar' | 'rechazar' | 'pendiente') {
		let nota: string | null = null;
		if (accion === 'rechazar') {
			nota = prompt('¿Por qué se rechaza? Lo verá quien lo registró.');
			if (!nota?.trim()) return;
		}
		ocupado = id;
		fallo = '';
		try {
			await pedir(`/api/lugares/${id}`, 'PATCH', { accion, nota_moderacion: nota });
			await invalidateAll();
		} catch (e) {
			fallo = e instanceof Error ? e.message : 'Error';
		} finally {
			ocupado = '';
		}
	}

	async function borrar(id: string, nombre: string) {
		if (!confirm(`¿Borrar "${nombre}" definitivamente? No se puede deshacer.`)) return;
		ocupado = id;
		try {
			await pedir(`/api/lugares/${id}`, 'DELETE', {});
			await invalidateAll();
		} catch (e) {
			fallo = e instanceof Error ? e.message : 'Error';
		} finally {
			ocupado = '';
		}
	}
</script>

<svelte:head>
	<title>Veeduría — Sismo 2026</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="px-4 py-4">
	<div class="flex items-start justify-between gap-3">
		<h1 class="text-2xl font-bold tracking-tight text-stone-900">Veeduría</h1>
		<form method="POST" action="/salir" class="shrink-0">
			<button type="submit" class="text-sm text-stone-500 underline">Salir</button>
		</form>
	</div>

	<nav class="mt-3 flex gap-2 text-sm font-semibold">
		<span class="text-stone-500">Moderación</span>
		<span class="text-stone-300">·</span>
		<a href="/veeduria/personas" class="text-brand-700 underline">Personas y accesos</a>
	</nav>

	{#if fallo}
		<p class="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">{fallo}</p>
	{/if}

	<nav class="mt-4 flex gap-2 overflow-x-auto">
		<button class="chip {pestana === 'cola' ? 'chip-on' : 'chip-off'}" onclick={() => (pestana = 'cola')}>
			Por revisar
			{#if pendientes.length}<span class="font-bold">· {pendientes.length}</span>{/if}
		</button>
		<button class="chip {pestana === 'publicados' ? 'chip-on' : 'chip-off'}" onclick={() => (pestana = 'publicados')}>
			Publicados · {publicados.length}
			{#if conReportes}<span class="font-bold text-amber-700">· {conReportes} con reportes</span>{/if}
		</button>
	</nav>

	{#if pestana === 'cola'}
		<!-- La cola es una sola cosa: lo que espera aprobación. Nada más. -->
		<div class="mt-6 space-y-3">
			{#each pendientes as lugar (lugar.id)}
				{@const duplicados = data.duplicados[lugar.id] ?? []}
				<article class="card p-4">
					<h3 class="font-bold text-stone-900">{lugar.nombre}</h3>
					<p class="mt-0.5 text-sm text-stone-600">
						{TIPO_POR_VALOR.get(lugar.tipo)?.nombre} · {lugar.ciudad}, {lugar.departamento}
					</p>
					<p class="mt-1 text-sm text-stone-600">{lugar.direccion}</p>
					{#if detalleUbicacion(lugar)}<p class="text-sm text-stone-600">{detalleUbicacion(lugar)}</p>{/if}
					{#if lugar.referencia}<p class="text-sm text-stone-500">{lugar.referencia}</p>{/if}
					{#if lugar.contacto_publico}<p class="mt-1 text-sm text-stone-600">📞 {lugar.contacto_publico}</p>{/if}
					{#if lugar.texto_libre}
						<p class="mt-2 border-l-2 border-stone-300 pl-2 text-sm whitespace-pre-line">{lugar.texto_libre}</p>
					{/if}
					{#if lugar.items.length}
						<p class="mt-2 text-sm text-stone-600">
							Piden: {lugar.items.map((i) => i.texto).join(', ')}
						</p>
					{/if}
					{#if lugar.lat === null}
						<p class="mt-2 text-sm text-amber-700">Sin ubicación en el mapa.</p>
					{/if}

					{#if duplicados.length}
						<p class="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
							Posible duplicado de {duplicados.map((d) => `${d.nombre} (${d.razon})`).join(', ')}
						</p>
					{/if}

					<div class="mt-3 flex flex-wrap gap-2">
						<button class="btn-primary" disabled={ocupado === lugar.id} onclick={() => moderar(lugar.id, 'aprobar')}>
							Aprobar
						</button>
						<button class="btn-secondary" disabled={ocupado === lugar.id} onclick={() => moderar(lugar.id, 'rechazar')}>
							Rechazar
						</button>
						<button class="btn-secondary text-red-700" disabled={ocupado === lugar.id} onclick={() => borrar(lugar.id, lugar.nombre)}>
							Borrar
						</button>
					</div>
				</article>
			{:else}
				<p class="card p-6 text-center text-stone-600">Nada pendiente de aprobación.</p>
			{/each}
		</div>
	{:else if pestana === 'publicados'}
		<div class="mt-6 space-y-2">
			{#each publicados as { lugar, reportes } (lugar.id)}
				<article class="card p-3 {reportes.length ? 'border-amber-300' : ''}">
					<div class="flex items-center justify-between gap-3">
						<div class="min-w-0">
							<h3 class="truncate font-semibold">
								<!--
								  Se abre aparte: revisar un caso no puede costar perder la
								  lista en la que se venía bajando.
								-->
								<a href="/lugar/{lugar.id}" target="_blank" rel="noopener"
									class="text-brand-800 underline decoration-stone-300 underline-offset-2">
									{lugar.nombre} ↗
								</a>
							</h3>
							<p class="text-sm text-stone-500">
								{lugar.ciudad} · {ESTADO_POR_VALOR.get(lugar.estado_operativo)?.corto} ·
								<span class={haceCuanto(lugar.actualizado_en).includes('día') ? 'font-semibold text-amber-700' : ''}>
									{actualizadoHace(lugar.actualizado_en)}
								</span>
							</p>
						</div>
						<button class="btn-secondary shrink-0 text-sm" disabled={ocupado === lugar.id}
							onclick={() => moderar(lugar.id, 'pendiente')}>
							Despublicar
						</button>
					</div>

					{#if reportes.length}
						<button
							type="button"
							class="mt-2 flex w-full items-center gap-2 rounded-lg bg-amber-50 px-2 py-1.5 text-left text-sm font-semibold text-amber-900"
							aria-expanded={abierto === lugar.id}
							onclick={() => (abierto = abierto === lugar.id ? '' : lugar.id)}
						>
							{reportes.length}
							{reportes.length === 1 ? 'reporte del público' : 'reportes del público'}
							<span class="ml-auto font-normal">{abierto === lugar.id ? 'ocultar ↑' : 'ver ↓'}</span>
						</button>

						{#if abierto === lugar.id}
							<ul class="mt-1.5 space-y-0.5 pl-2 text-sm text-stone-700">
								{#each reportes as reporte (reporte.id)}
									<li>
										· {motivoNombre[reporte.motivo]}
										<span class="text-stone-400">{haceCuanto(reporte.creado_en)}</span>
									</li>
								{/each}
							</ul>
							<p class="mt-1.5 pl-2 text-xs text-stone-500">
								Le aparecen a quien maneja el lugar en su panel, para que corrija. Siguen acá hasta
								que los marque como revisados.
							</p>
						{/if}
					{/if}
				</article>
			{:else}
				<p class="card p-6 text-center text-stone-600">Todavía no hay nada publicado.</p>
			{/each}
		</div>
	{/if}
</main>

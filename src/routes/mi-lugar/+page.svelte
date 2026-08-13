<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import FormularioLugar from '$lib/components/FormularioLugar.svelte';
	import ListaItems from '$lib/components/ListaItems.svelte';
	import { ESTADOS_OPERATIVOS, MOTIVOS_REPORTE } from '$lib/constantes';
	import { actualizadoHace, detalleUbicacion, haceCuanto } from '$lib/formato';
	import type { EstadoOperativo, ItemNuevo } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const lugar = $derived(data.lugar);

	const motivoNombre = Object.fromEntries(MOTIVOS_REPORTE.map((m) => [m.valor, m.nombre]));

	let guardando = $state(false);
	let guardandoContenido = $state(false);
	let cambiandoEstado = $state<EstadoOperativo | null>(null);
	let atendiendo = $state(false);
	let fallo = $state('');
	let aviso = $state('');
	let editando = $state(false);

	// Copia editable del contenido libre. Se rearma cuando el servidor devuelve
	// un lugar distinto, pero no en cada refresco: si alguien está escribiendo,
	// un `invalidateAll` de otra acción no le puede borrar el párrafo.
	let textoLibre = $state('');
	let items = $state<ItemNuevo[]>([]);
	let contenidoCargado = $state<string | null>(null);

	$effect(() => {
		if (!lugar || contenidoCargado === lugar.id) return;
		contenidoCargado = lugar.id;
		textoLibre = lugar.texto_libre ?? '';
		items = lugar.items.map(({ texto, categoria, nivel }) => ({ texto, categoria, nivel }));
	});

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

	async function cambiarEstado(estado: EstadoOperativo) {
		if (!lugar) return;
		cambiandoEstado = estado;
		fallo = '';
		try {
			await pedir(`/api/lugares/${lugar.id}/estado`, 'POST', { estado_operativo: estado });
			aviso = 'Estado actualizado. Ya se ve en la lista pública.';
			await invalidateAll();
		} catch (e) {
			fallo = e instanceof Error ? e.message : 'No se pudo actualizar';
		} finally {
			cambiandoEstado = null;
		}
	}

	async function atenderReportes() {
		atendiendo = true;
		fallo = '';
		try {
			await pedir('/api/mi-lugar/reportes', 'POST', {});
			aviso = 'Listo. Los reportes quedan como revisados.';
			await invalidateAll();
		} catch (e) {
			fallo = e instanceof Error ? e.message : 'No se pudo marcar';
		} finally {
			atendiendo = false;
		}
	}

	async function guardarContenido() {
		guardandoContenido = true;
		fallo = '';
		try {
			await pedir('/api/mi-lugar/contenido', 'PUT', { texto_libre: textoLibre, items });
			aviso = 'Actualizado. La gente ya lo ve.';
			contenidoCargado = null; // Que se recargue con lo que quedó guardado.
			await invalidateAll();
		} catch (e) {
			fallo = e instanceof Error ? e.message : 'No se pudo guardar';
		} finally {
			guardandoContenido = false;
		}
	}

	async function guardar(datos: Record<string, unknown>) {
		guardando = true;
		fallo = '';
		try {
			if (lugar) {
				await pedir('/api/lugares', 'PATCH', { ...datos, estado_operativo: lugar.estado_operativo });
				aviso = 'Cambios guardados.';
				editando = false;
			} else {
				await pedir('/api/lugares', 'POST', datos);
				aviso = 'Lugar registrado. Queda pendiente de revisión y aparecerá apenas lo aprueben.';
			}
			contenidoCargado = null;
			await invalidateAll();
		} catch (e) {
			fallo = e instanceof Error ? e.message : 'No se pudo guardar';
		} finally {
			guardando = false;
		}
	}
</script>

<svelte:head>
	<title>Mi lugar — Sismo 2026</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="px-4 py-4">
	{#if aviso}
		<p class="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
			{aviso}
		</p>
	{/if}
	{#if fallo}
		<p class="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">{fallo}</p>
	{/if}

	{#if !lugar}
		<!--
		  Primera vez. Es la única pantalla que ve quien acaba de entrar: se
		  configura el lugar y de ahí en adelante esta ruta ya es el panel.
		-->
		<h1 class="text-2xl font-bold tracking-tight text-stone-900">Registre su centro</h1>
		<p class="mt-2 mb-6 text-stone-600">
			Bienvenido, <strong>{data.etiquetaToken}</strong>. Son cuatro pasos cortos y después queda todo
			editable desde acá.
		</p>
		<FormularioLugar enviando={guardando} onguardar={guardar} />
	{:else}
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<h1 class="text-2xl font-bold tracking-tight text-stone-900">{lugar.nombre}</h1>
				<p class="mt-1 text-sm text-stone-500">{actualizadoHace(lugar.actualizado_en)}</p>
			</div>
			<form method="POST" action="/salir" class="shrink-0">
				<button type="submit" class="text-sm text-stone-500 underline">Salir</button>
			</form>
		</div>

		{#if lugar.estado_moderacion === 'pendiente'}
			<p class="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
				Pendiente de revisión. Todavía no aparece en la lista pública.
			</p>
		{:else if lugar.estado_moderacion === 'rechazado'}
			<p class="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
				No fue aprobado.{#if lugar.nota_moderacion}
					Motivo: {lugar.nota_moderacion}
				{/if}
			</p>
		{/if}

		<!--
		  Lo que reportó la gente que llegó al sitio. Va arriba de todo y no en
		  veeduría: es alguien parado en la puerta viendo algo distinto a lo que
		  dice la pantalla, y el único que puede arreglarlo en diez segundos es
		  quien está leyendo esto. Casi siempre se resuelve con un toque en el
		  estado o un renglón en la lista de abajo.
		-->
		{#if data.reportes.length}
			<section class="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
				<h2 class="font-bold text-amber-900">
					{data.reportes.length}
					{data.reportes.length === 1 ? 'persona reportó' : 'personas reportaron'} algo sobre su punto
				</h2>
				<ul class="mt-2 space-y-0.5 text-sm text-amber-900">
					{#each data.reportes as reporte (reporte.id)}
						<li>
							· {motivoNombre[reporte.motivo]}
							<span class="text-amber-700/70">{haceCuanto(reporte.creado_en)}</span>
						</li>
					{/each}
				</ul>
				<button type="button" class="btn-secondary mt-3 text-sm" disabled={atendiendo}
					onclick={atenderReportes}>
					{atendiendo ? 'Guardando…' : 'Ya lo revisé'}
				</button>
			</section>
		{/if}

		<!--
		  Lo primero y más grande de la pantalla. Es lo que se usa a diario, de
		  pie y con una mano; editar los datos es algo que se hace una vez.
		-->
		<section class="mt-6">
			<h2 class="mb-1 font-bold text-stone-900">¿Cómo están ahora?</h2>
			<p class="mb-3 text-sm text-stone-600">Un toque. Es lo que ve la gente antes de decidir si va.</p>

			<div class="grid gap-2">
				{#each ESTADOS_OPERATIVOS as estado (estado.valor)}
					{@const activo = lugar.estado_operativo === estado.valor}
					<button
						type="button"
						class="rounded-2xl border-2 p-4 text-left transition {activo
							? estado.clase + ' ring-2 ring-stone-900/10'
							: 'border-stone-200 bg-white hover:border-stone-300'}"
						disabled={cambiandoEstado !== null}
						onclick={() => cambiarEstado(estado.valor)}
					>
						<span class="flex items-center gap-2 text-base font-bold">
							<span class="h-3 w-3 shrink-0 rounded-full {estado.punto}"></span>
							{estado.nombre}
							{#if activo}<span class="ml-auto text-sm font-semibold">actual</span>{/if}
							{#if cambiandoEstado === estado.valor}<span class="ml-auto text-sm">guardando…</span>{/if}
						</span>
						<span class="mt-1 block text-sm {activo ? '' : 'text-stone-600'}">{estado.descripcion}</span>
					</button>
				{/each}
			</div>
		</section>

		<!--
		  Lo segundo en importancia y lo que más cambia: la lista de lo que hace
		  falta hoy y el mensaje del lugar. Se guarda aparte del formulario
		  completo para que actualizarlo tres veces al día no cueste nada.
		-->
		<section class="mt-8">
			<h2 class="font-bold text-stone-900">Qué necesitan hoy</h2>
			<p class="mt-1 mb-3 text-sm text-stone-600">Esto no pasa por revisión: se ve apenas lo guarde.</p>

			<div class="card space-y-4 p-4">
				<div>
					<span class="label">Lista de cosas puntuales</span>
					<ListaItems bind:items />
				</div>

				<div>
					<label class="label" for="texto-libre">Mensaje para quien vaya a venir</label>
					<textarea
						id="texto-libre"
						class="input"
						bind:value={textoLibre}
						maxlength="2000"
						rows="6"
						placeholder={'Recibimos de 7am a 7pm.\nNo estamos recibiendo ropa usada.\nNecesitamos gente que ayude a clasificar en la tarde.'}
					></textarea>
					<p class="mt-1 text-sm text-stone-500">{textoLibre.length}/2000</p>
				</div>

				<button type="button" class="btn-primary w-full" disabled={guardandoContenido}
					onclick={guardarContenido}>
					{guardandoContenido ? 'Guardando…' : 'Actualizar'}
				</button>
			</div>
		</section>

		<section class="mt-8">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="font-bold text-stone-900">Datos del lugar</h2>
				<button type="button" class="text-sm font-semibold text-brand-700 underline"
					onclick={() => (editando = !editando)}>
					{editando ? 'Cancelar' : 'Editar'}
				</button>
			</div>

			{#if editando}
				{#key lugar.actualizado_en}
					<FormularioLugar {lugar} enviando={guardando} onguardar={guardar} />
				{/key}
			{:else}
				{@const detalle = detalleUbicacion(lugar)}
				<div class="card divide-y divide-stone-200 text-sm">
					<p class="p-3"><span class="text-stone-500">Dirección:</span> {lugar.direccion}</p>
					{#if detalle}<p class="p-3"><span class="text-stone-500">Detalle:</span> {detalle}</p>{/if}
					<p class="p-3"><span class="text-stone-500">Ciudad:</span> {lugar.ciudad}, {lugar.departamento}</p>
					{#if lugar.referencia}<p class="p-3"><span class="text-stone-500">Cómo llegar:</span> {lugar.referencia}</p>{/if}
					{#if lugar.horario}<p class="p-3"><span class="text-stone-500">Horario:</span> {lugar.horario}</p>{/if}
					<p class="p-3">
						<span class="text-stone-500">Categorías:</span>
						{lugar.necesidades.length ? lugar.necesidades.map((n) => n.etiqueta).join(', ') : 'ninguna marcada'}
					</p>
					{#if lugar.lat === null}
						<p class="p-3 text-amber-700">
							Sin punto en el mapa. Póngalo desde «Editar»: es lo que más ayuda a que lleguen.
						</p>
					{/if}
				</div>
			{/if}
		</section>

		{#if lugar.estado_moderacion === 'aprobado'}
			<a class="btn-secondary mt-6 block text-center" href="/lugar/{lugar.id}">Ver cómo lo ve la gente</a>
		{/if}
	{/if}
</main>

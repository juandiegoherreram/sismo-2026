<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import FormularioLugar from '$lib/components/FormularioLugar.svelte';
	import { ESTADOS_OPERATIVOS } from '$lib/constantes';
	import { haceCuanto } from '$lib/formato';
	import type { EstadoOperativo } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const token = $derived(page.url.searchParams.get('k') ?? '');
	const lugar = $derived(data.lugar);

	let guardando = $state(false);
	let cambiandoEstado = $state<EstadoOperativo | null>(null);
	let fallo = $state('');
	let aviso = $state('');
	let editando = $state(false);

	async function pedir(url: string, metodo: string, cuerpo: unknown) {
		const res = await fetch(url, {
			method: metodo,
			headers: { 'content-type': 'application/json', 'x-token': token },
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
		<h1 class="text-2xl font-bold tracking-tight text-stone-900">Registre su lugar</h1>
		<p class="mt-1 mb-6 text-stone-600">
			Este acceso permite registrar <strong>un solo lugar</strong>, y después lo puede editar cuando quiera.
		</p>
		<FormularioLugar enviando={guardando} onguardar={guardar} />
	{:else}
		<h1 class="text-2xl font-bold tracking-tight text-stone-900">{lugar.nombre}</h1>
		<p class="mt-1 text-sm text-stone-500">
			Actualizado {haceCuanto(lugar.actualizado_en)}
		</p>

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
				<div class="card divide-y divide-stone-200 text-sm">
					<p class="p-3"><span class="text-stone-500">Dirección:</span> {lugar.direccion}</p>
					<p class="p-3"><span class="text-stone-500">Ciudad:</span> {lugar.ciudad}, {lugar.departamento}</p>
					{#if lugar.horario}<p class="p-3"><span class="text-stone-500">Horario:</span> {lugar.horario}</p>{/if}
					{#if lugar.nota}<p class="p-3"><span class="text-stone-500">Nota:</span> {lugar.nota}</p>{/if}
					<p class="p-3">
						<span class="text-stone-500">Necesidades:</span>
						{lugar.necesidades.length ? lugar.necesidades.map((n) => n.etiqueta).join(', ') : 'ninguna marcada'}
					</p>
				</div>
			{/if}
		</section>

		{#if lugar.estado_moderacion === 'aprobado'}
			<a class="btn-secondary mt-6 block text-center" href="/lugar/{lugar.id}">Ver cómo lo ve la gente</a>
		{/if}
	{/if}
</main>

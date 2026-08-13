<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { ESTADO_POR_VALOR } from '$lib/constantes';
	import { actualizadoHace, haceCuanto } from '$lib/formato';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let fallo = $state('');
	let ocupado = $state('');
	let busqueda = $state('');
	let filtro = $state<'todos' | 'sin_usar' | 'con_lugar' | 'callados' | 'revocados'>('todos');

	// Alta de acceso
	let etiqueta = $state('');
	let canal = $state('whatsapp');
	let telefono = $state('');
	let rol = $state<'editor' | 'veedor'>('editor');
	let linkNuevo = $state('');
	let mensajeNuevo = $state('');
	let avisoEnvio = $state('');
	let copiado = $state('');

	const DOS_DIAS = 48 * 3600_000;

	/**
	 * "Callado" = tiene lugar publicado pero lleva más de dos días sin tocarlo.
	 * Es la señal que dispara una llamada: el dato viejo hace más daño que la
	 * ausencia del dato, porque la gente se desplaza confiando en él.
	 */
	function estaCallado(p: PageData['personas'][number]): boolean {
		if (!p.lugar || p.lugar.estado_moderacion !== 'aprobado') return false;
		return Date.now() - Date.parse(p.lugar.actualizado_en) > DOS_DIAS;
	}

	const filtradas = $derived.by(() => {
		const q = busqueda.trim().toLowerCase();

		return data.personas.filter((p) => {
			if (filtro === 'sin_usar' && (p.lugar || p.estado === 'revocado')) return false;
			if (filtro === 'con_lugar' && !p.lugar) return false;
			if (filtro === 'callados' && !estaCallado(p)) return false;
			if (filtro === 'revocados' && p.estado !== 'revocado') return false;
			if (filtro !== 'revocados' && filtro !== 'todos' && p.estado === 'revocado') return false;

			if (!q) return true;
			return (
				p.etiqueta.toLowerCase().includes(q) ||
				(p.lugar?.nombre ?? '').toLowerCase().includes(q) ||
				(p.lugar?.ciudad ?? '').toLowerCase().includes(q)
			);
		});
	});

	const conteos = $derived({
		total: data.personas.filter((p) => p.estado === 'activo').length,
		sinUsar: data.personas.filter((p) => p.estado === 'activo' && !p.lugar).length,
		callados: data.personas.filter(estaCallado).length
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

	async function crearAcceso(e: SubmitEvent) {
		e.preventDefault();
		ocupado = 'token';
		fallo = '';
		linkNuevo = '';
		avisoEnvio = '';
		try {
			const res = await pedir('/api/tokens', 'POST', { etiqueta, canal, telefono, rol });
			linkNuevo = res.link;
			mensajeNuevo = res.mensaje;
			avisoEnvio = res.enviado ? 'Enviado por WhatsApp.' : (res.fallo ?? '');
			etiqueta = '';
			telefono = '';
			await invalidateAll();
		} catch (err) {
			fallo = err instanceof Error ? err.message : 'Error';
		} finally {
			ocupado = '';
		}
	}

	async function revocar(id: string, nombre: string) {
		if (!confirm(`¿Revocar el acceso de "${nombre}"? El link deja de servir de inmediato.`)) return;
		ocupado = id;
		fallo = '';
		try {
			await pedir('/api/tokens', 'DELETE', { id });
			await invalidateAll();
		} catch (e) {
			fallo = e instanceof Error ? e.message : 'Error';
		} finally {
			ocupado = '';
		}
	}

	async function renombrar(id: string, actual: string) {
		const nuevo = prompt('¿A quién se le entregó este acceso?', actual);
		if (!nuevo?.trim() || nuevo === actual) return;
		ocupado = id;
		fallo = '';
		try {
			await pedir('/api/tokens', 'PATCH', { id, etiqueta: nuevo.trim() });
			await invalidateAll();
		} catch (e) {
			fallo = e instanceof Error ? e.message : 'Error';
		} finally {
			ocupado = '';
		}
	}

	async function copiar(texto: string, cual: string) {
		await navigator.clipboard.writeText(texto);
		copiado = cual;
		setTimeout(() => (copiado = ''), 2000);
	}
</script>

<svelte:head>
	<title>Personas y accesos — Sismo 2026</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="px-4 py-4">
	<div class="flex items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-stone-900">Personas y accesos</h1>
			<p class="mt-1 text-sm text-stone-600">
				{conteos.total} accesos activos · {conteos.sinUsar} sin usar · {conteos.callados} sin actualizar
			</p>
		</div>
		<form method="POST" action="/salir" class="shrink-0">
			<button type="submit" class="text-sm text-stone-500 underline">Salir</button>
		</form>
	</div>

	<nav class="mt-3 flex gap-2 text-sm font-semibold">
		<a href="/veeduria" class="text-brand-700 underline">Moderación</a>
		<span class="text-stone-300">·</span>
		<span class="text-stone-500">Personas</span>
	</nav>

	{#if fallo}
		<p class="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">{fallo}</p>
	{/if}

	<!-- ── Generador de links ───────────────────────────────────────────── -->
	<form onsubmit={crearAcceso} class="card mt-6 space-y-3 p-4">
		<h2 class="font-bold text-stone-900">Generar acceso</h2>
		<p class="text-sm text-stone-600">Quien tenga el link, edita. Entréguelo solo tras confirmar con el sitio.</p>

		<div>
			<label class="label" for="etiqueta">¿A quién se le entrega?</label>
			<input id="etiqueta" class="input" bind:value={etiqueta} required maxlength="160"
				placeholder="Cruz Roja Chapinero — Ana, 300 123 4567" />
			<p class="mt-1 text-sm text-stone-500">Nombre y teléfono, para saber después quién es quién.</p>
		</div>

		<div class="grid gap-3 sm:grid-cols-3">
			<div>
				<label class="label" for="rol">Tipo</label>
				<select id="rol" class="input" bind:value={rol}>
					<option value="editor">Centro de acopio</option>
					<option value="veedor">Veeduría</option>
				</select>
			</div>
			<div>
				<label class="label" for="canal">Canal</label>
				<select id="canal" class="input" bind:value={canal}>
					<option value="whatsapp">WhatsApp</option>
					<option value="instagram">Instagram</option>
					<option value="presencial">Presencial</option>
					<option value="otro">Otro</option>
				</select>
			</div>
			<div>
				<label class="label" for="telefono">Enviar a <span class="font-normal text-stone-500">(opcional)</span></label>
				<input id="telefono" class="input" bind:value={telefono} maxlength="20" placeholder="573001234567" />
			</div>
		</div>

		{#if rol === 'veedor'}
			<p class="rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
				Veeduría puede aprobar, borrar y generar más accesos. Solo para el equipo.
			</p>
		{/if}

		<button type="submit" class="btn-primary w-full" disabled={ocupado === 'token'}>
			{ocupado === 'token' ? 'Generando…' : 'Generar acceso'}
		</button>

		{#if linkNuevo}
			<!-- El token solo se ve acá y una vez: en la base queda su hash. -->
			<div class="rounded-xl border border-emerald-300 bg-emerald-50 p-3">
				<p class="text-sm font-semibold text-emerald-900">Copie el link ahora: no se vuelve a mostrar.</p>
				{#if avisoEnvio}<p class="mt-1 text-sm text-emerald-800">{avisoEnvio}</p>{/if}
				<p class="mt-2 rounded-lg bg-white p-2 font-mono text-xs break-all">{linkNuevo}</p>
				<div class="mt-2 flex flex-wrap gap-2">
					<button type="button" class="btn-secondary text-sm" onclick={() => copiar(linkNuevo, 'link')}>
						{copiado === 'link' ? 'Copiado ✓' : 'Copiar link'}
					</button>
					<button type="button" class="btn-secondary text-sm" onclick={() => copiar(mensajeNuevo, 'msg')}>
						{copiado === 'msg' ? 'Copiado ✓' : 'Copiar mensaje completo'}
					</button>
				</div>
			</div>
		{/if}
	</form>

	<!-- ── Directorio ───────────────────────────────────────────────────── -->
	<section class="mt-8">
		<h2 class="font-bold text-stone-900">Quién tiene acceso</h2>

		<input class="input mt-3" type="search" bind:value={busqueda}
			placeholder="Buscar por nombre, lugar o ciudad" aria-label="Buscar" />

		<div class="mt-3 flex flex-wrap gap-2">
			{#each [
				{ valor: 'todos', nombre: 'Todos' },
				{ valor: 'sin_usar', nombre: 'Nunca lo usaron' },
				{ valor: 'con_lugar', nombre: 'Con lugar' },
				{ valor: 'callados', nombre: 'Sin actualizar' },
				{ valor: 'revocados', nombre: 'Revocados' }
			] as const as opcion (opcion.valor)}
				<button type="button" class="chip {filtro === opcion.valor ? 'chip-on' : 'chip-off'}"
					onclick={() => (filtro = opcion.valor)}>
					{opcion.nombre}
				</button>
			{/each}
		</div>

		<div class="mt-4 space-y-2">
			{#each filtradas as p (p.id)}
				<article class="card p-3 {p.estado === 'revocado' ? 'opacity-60' : ''}">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<h3 class="font-semibold break-words text-stone-900">{p.etiqueta}</h3>
							<p class="mt-0.5 text-sm text-stone-500">
								{p.rol === 'veedor' ? 'Veeduría' : 'Centro'}{#if p.canal} · {p.canal}{/if} ·
								creado {haceCuanto(p.creado_en)}
								{#if p.estado === 'revocado'} · <span class="font-semibold text-red-700">revocado</span>{/if}
							</p>
						</div>

						<div class="flex shrink-0 gap-2">
							<button class="text-sm text-stone-500 underline" disabled={ocupado === p.id}
								onclick={() => renombrar(p.id, p.etiqueta)}>
								Renombrar
							</button>
							{#if p.estado === 'activo' && p.id !== data.yo}
								<button class="text-sm text-red-700 underline" disabled={ocupado === p.id}
									onclick={() => revocar(p.id, p.etiqueta)}>
									Revocar
								</button>
							{/if}
						</div>
					</div>

					{#if p.lugar}
						<div class="mt-2 rounded-lg bg-stone-50 p-2 text-sm">
							<a class="font-semibold text-brand-700 underline" href="/lugar/{p.lugar.id}">
								{p.lugar.nombre}
							</a>
							<p class="text-stone-600">
								{p.lugar.ciudad} ·
								{#if p.lugar.estado_moderacion === 'aprobado'}
									{ESTADO_POR_VALOR.get(p.lugar.estado_operativo)?.corto}
								{:else}
									{p.lugar.estado_moderacion === 'pendiente' ? 'sin aprobar' : 'rechazado'}
								{/if}
								·
								<span class={estaCallado(p) ? 'font-semibold text-amber-700' : ''}>
									{actualizadoHace(p.lugar.actualizado_en)}
								</span>
							</p>
						</div>
					{:else if p.rol === 'editor'}
						<p class="mt-2 text-sm text-amber-700">
							Sin lugar registrado
							{#if p.usado_en}· entró {haceCuanto(p.usado_en)}{:else}· nunca abrió el link{/if}
						</p>
					{/if}
				</article>
			{:else}
				<p class="card p-6 text-center text-stone-600">Nadie coincide con ese filtro.</p>
			{/each}
		</div>
	</section>
</main>

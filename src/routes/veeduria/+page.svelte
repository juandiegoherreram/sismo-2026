<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { ESTADO_POR_VALOR, MOTIVOS_REPORTE, TIPO_POR_VALOR } from '$lib/constantes';
	import { haceCuanto } from '$lib/formato';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const token = $derived(page.url.searchParams.get('k') ?? '');

	let pestana = $state<'cola' | 'publicados' | 'accesos'>('cola');
	let fallo = $state('');
	let ocupado = $state('');

	// Alta de acceso
	let etiqueta = $state('');
	let canal = $state('whatsapp');
	let telefono = $state('');
	let linkNuevo = $state('');
	let mensajeNuevo = $state('');
	let avisoEnvio = $state('');

	const motivoNombre = Object.fromEntries(MOTIVOS_REPORTE.map((m) => [m.valor, m.nombre]));

	const pendientes = $derived(data.lugares.filter((l) => l.estado_moderacion === 'pendiente'));
	const publicados = $derived(data.lugares.filter((l) => l.estado_moderacion === 'aprobado'));

	// Lo que el público reportó sube al tope: es la señal de campo más fresca.
	const conReportes = $derived(
		publicados
			.filter((l) => (data.reportesPorLugar[l.id] ?? 0) > 0)
			.sort((a, b) => (data.reportesPorLugar[b.id] ?? 0) - (data.reportesPorLugar[a.id] ?? 0))
	);

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

	async function crearAcceso(e: SubmitEvent) {
		e.preventDefault();
		ocupado = 'token';
		fallo = '';
		linkNuevo = '';
		avisoEnvio = '';
		try {
			const res = await pedir('/api/tokens', 'POST', { etiqueta, canal, telefono });
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

	async function revocar(id: string, etiquetaToken: string) {
		if (!confirm(`¿Revocar el acceso de "${etiquetaToken}"? El link deja de servir.`)) return;
		ocupado = id;
		try {
			await pedir('/api/tokens', 'DELETE', { id });
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
	<h1 class="text-2xl font-bold tracking-tight text-stone-900">Veeduría</h1>

	{#if fallo}
		<p class="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">{fallo}</p>
	{/if}

	<nav class="mt-4 flex gap-2 overflow-x-auto">
		<button class="chip {pestana === 'cola' ? 'chip-on' : 'chip-off'}" onclick={() => (pestana = 'cola')}>
			Por revisar
			{#if pendientes.length + conReportes.length}<span class="font-bold">· {pendientes.length + conReportes.length}</span>{/if}
		</button>
		<button class="chip {pestana === 'publicados' ? 'chip-on' : 'chip-off'}" onclick={() => (pestana = 'publicados')}>
			Publicados · {publicados.length}
		</button>
		<button class="chip {pestana === 'accesos' ? 'chip-on' : 'chip-off'}" onclick={() => (pestana = 'accesos')}>
			Accesos · {data.tokens.length}
		</button>
	</nav>

	{#if pestana === 'cola'}
		{#if conReportes.length}
			<h2 class="mt-6 mb-2 font-bold text-stone-900">Reportados por el público</h2>
			<div class="space-y-3">
				{#each conReportes as lugar (lugar.id)}
					{@const motivos = data.reportes.filter((r) => r.lugar_id === lugar.id)}
					<article class="card border-amber-300 p-4">
						<div class="flex items-start justify-between gap-2">
							<h3 class="font-bold text-stone-900">{lugar.nombre}</h3>
							<span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
								{motivos.length} reporte{motivos.length === 1 ? '' : 's'}
							</span>
						</div>
						<p class="mt-1 text-sm text-stone-600">
							{lugar.ciudad} · dice estar «{ESTADO_POR_VALOR.get(lugar.estado_operativo)?.corto}» ·
							actualizado {haceCuanto(lugar.actualizado_en)}
						</p>
						<ul class="mt-2 text-sm text-stone-700">
							{#each motivos as reporte (reporte.id)}
								<li>· {motivoNombre[reporte.motivo]} <span class="text-stone-400">{haceCuanto(reporte.creado_en)}</span></li>
							{/each}
						</ul>
						<p class="mt-2 text-sm text-stone-500">Llame al responsable y pídale que actualice el estado.</p>
					</article>
				{/each}
			</div>
		{/if}

		<h2 class="mt-6 mb-2 font-bold text-stone-900">Pendientes de aprobación</h2>
		<div class="space-y-3">
			{#each pendientes as lugar (lugar.id)}
				{@const duplicados = data.duplicados[lugar.id] ?? []}
				<article class="card p-4">
					<h3 class="font-bold text-stone-900">{lugar.nombre}</h3>
					<p class="mt-0.5 text-sm text-stone-600">
						{TIPO_POR_VALOR.get(lugar.tipo)?.nombre} · {lugar.ciudad}, {lugar.departamento}
					</p>
					<p class="mt-1 text-sm text-stone-600">{lugar.direccion}</p>
					{#if lugar.referencia}<p class="text-sm text-stone-500">{lugar.referencia}</p>{/if}
					{#if lugar.contacto_publico}<p class="mt-1 text-sm text-stone-600">📞 {lugar.contacto_publico}</p>{/if}
					{#if lugar.nota}<p class="mt-2 border-l-2 border-stone-300 pl-2 text-sm">{lugar.nota}</p>{/if}
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
				<p class="card p-6 text-center text-stone-600">Nada pendiente. Todo al día.</p>
			{/each}
		</div>
	{:else if pestana === 'publicados'}
		<div class="mt-6 space-y-2">
			{#each publicados as lugar (lugar.id)}
				<article class="card flex items-center justify-between gap-3 p-3">
					<div class="min-w-0">
						<h3 class="truncate font-semibold text-stone-900">{lugar.nombre}</h3>
						<p class="text-sm text-stone-500">
							{lugar.ciudad} · {ESTADO_POR_VALOR.get(lugar.estado_operativo)?.corto} ·
							<span class={haceCuanto(lugar.actualizado_en).includes('día') ? 'font-semibold text-amber-700' : ''}>
								{haceCuanto(lugar.actualizado_en)}
							</span>
						</p>
					</div>
					<button class="btn-secondary shrink-0 text-sm" disabled={ocupado === lugar.id}
						onclick={() => moderar(lugar.id, 'pendiente')}>
						Despublicar
					</button>
				</article>
			{:else}
				<p class="card p-6 text-center text-stone-600">Todavía no hay nada publicado.</p>
			{/each}
		</div>
	{:else}
		<form onsubmit={crearAcceso} class="card mt-6 space-y-3 p-4">
			<h2 class="font-bold text-stone-900">Nuevo acceso</h2>
			<div>
				<label class="label" for="etiqueta">¿A quién se le entrega?</label>
				<input id="etiqueta" class="input" bind:value={etiqueta} required maxlength="160"
					placeholder="Cruz Roja Chapinero — Ana, 300 123 4567" />
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
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
			<button type="submit" class="btn-primary w-full" disabled={ocupado === 'token'}>
				{ocupado === 'token' ? 'Generando…' : 'Generar acceso'}
			</button>

			{#if linkNuevo}
				<!-- El token solo se ve acá y una vez: en la base queda su hash. -->
				<div class="rounded-xl border border-emerald-300 bg-emerald-50 p-3">
					<p class="text-sm font-semibold text-emerald-900">
						Copie el link ahora: no se vuelve a mostrar.
					</p>
					{#if avisoEnvio}<p class="mt-1 text-sm text-emerald-800">{avisoEnvio}</p>{/if}
					<p class="mt-2 rounded-lg bg-white p-2 font-mono text-xs break-all">{linkNuevo}</p>
					<div class="mt-2 flex gap-2">
						<button type="button" class="btn-secondary text-sm"
							onclick={() => navigator.clipboard.writeText(linkNuevo)}>
							Copiar link
						</button>
						<button type="button" class="btn-secondary text-sm"
							onclick={() => navigator.clipboard.writeText(mensajeNuevo)}>
							Copiar mensaje completo
						</button>
					</div>
				</div>
			{/if}
		</form>

		<div class="mt-4 space-y-2">
			{#each data.tokens as t (t.id)}
				<article class="card flex items-center justify-between gap-3 p-3 {t.estado === 'revocado' ? 'opacity-50' : ''}">
					<div class="min-w-0">
						<p class="truncate font-semibold text-stone-900">{t.etiqueta}</p>
						<p class="text-sm text-stone-500">
							{t.rol}{#if t.canal} · {t.canal}{/if} ·
							{#if t.lugar_id}con lugar{:else}sin usar{/if}
							{#if t.usado_en} · activo {haceCuanto(t.usado_en)}{/if}
							{#if t.estado === 'revocado'} · revocado{/if}
						</p>
					</div>
					{#if t.estado === 'activo'}
						<button class="btn-secondary shrink-0 text-sm text-red-700" disabled={ocupado === t.id}
							onclick={() => revocar(t.id, t.etiqueta)}>
							Revocar
						</button>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</main>

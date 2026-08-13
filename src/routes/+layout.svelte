<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';

	let { children } = $props();

	// La navegación conserva los filtros para que saltar de lista a mapa no
	// obligue a volver a filtrar.
	const query = $derived(page.url.search);
	const ruta = $derived(page.url.pathname);
	const publica = $derived(ruta === '/' || ruta === '/mapa');
</script>

<div class="mx-auto min-h-dvh max-w-3xl">
	<header class="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
		<div class="flex items-center justify-between gap-3 px-4 py-3">
			<a href="/{query}" class="flex items-center gap-2">
				<span class="text-xl" aria-hidden="true">🆘</span>
				<span class="font-bold tracking-tight text-stone-900">Sismo 2026</span>
			</a>

			{#if publica}
				<nav class="flex rounded-xl border border-stone-300 bg-white p-0.5 text-sm font-semibold">
					<a
						href="/{query}"
						class="rounded-lg px-3 py-1.5 {ruta === '/' ? 'bg-brand-700 text-white' : 'text-stone-600'}"
					>
						Lista
					</a>
					<a
						href="/mapa{query}"
						class="rounded-lg px-3 py-1.5 {ruta === '/mapa' ? 'bg-brand-700 text-white' : 'text-stone-600'}"
					>
						Mapa
					</a>
				</nav>
			{/if}
		</div>
	</header>

	{@render children()}

	<footer class="mt-12 border-t border-stone-200 px-4 py-6 text-sm text-stone-500">
		<p>
			Información reportada por los mismos centros y revisada por voluntarios. Puede haber
			desactualizaciones: si puede, confirme por teléfono antes de desplazarse.
		</p>
		<p class="mt-2">
			¿Coordina un centro y quiere aparecer acá?
			<a class="font-semibold text-brand-700 underline" href="/registrar">Solicite su acceso</a>.
		</p>
	</footer>
</div>

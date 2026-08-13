<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} — Sismo 2026</title>
</svelte:head>

<main class="px-4 py-16 text-center">
	<p class="text-5xl font-bold text-stone-300">{page.status}</p>
	<h1 class="mt-3 text-xl font-bold text-stone-900">
		{page.error?.message ?? 'Algo salió mal'}
	</h1>
	<a href="/" class="btn-primary mt-6 inline-block">Ir al directorio</a>
</main>

<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let enviando = $state(false);
</script>

<svelte:head>
	<title>Entrar — Sismo 2026</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="px-4 py-8">
	<h1 class="text-2xl font-bold tracking-tight text-stone-900">Entrar con su link</h1>
	<p class="mt-2 text-stone-600">
		No hay usuario ni contraseña. El link que le enviamos es su acceso: ábralo y queda adentro.
	</p>

	{#if data.expiro}
		<p class="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
			Ese link ya no sirve. Puede que se haya revocado o que esté incompleto — a veces WhatsApp
			corta el final.
		</p>
	{/if}

	{#if form?.mensaje}
		<p class="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">
			{form.mensaje}
		</p>
	{/if}

	<form
		method="POST"
		class="card mt-6 space-y-3 p-4"
		use:enhance={() => {
			enviando = true;
			return async ({ update }) => {
				await update();
				enviando = false;
			};
		}}
	>
		<div>
			<label class="label" for="acceso">Pegue el link, o escriba solo el código</label>
			<input
				id="acceso"
				name="acceso"
				class="input font-mono"
				required
				autocomplete="off"
				autocapitalize="characters"
				spellcheck="false"
				placeholder="B7K2… o el link completo"
			/>
			<p class="mt-1 text-sm text-stone-500">
				El código son las letras y números después de <span class="font-mono">k=</span>.
			</p>
		</div>

		<button type="submit" class="btn-primary w-full" disabled={enviando}>
			{enviando ? 'Verificando…' : 'Entrar'}
		</button>
	</form>

	<p class="mt-6 text-sm text-stone-600">
		¿No tiene acceso todavía?
		<a class="font-semibold text-brand-700 underline" href="/registrar">Solicítelo acá</a>.
	</p>
</main>

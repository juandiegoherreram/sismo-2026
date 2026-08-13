<script lang="ts">
	import { MOTIVOS_REPORTE } from '$lib/constantes';

	let { lugarId }: { lugarId: string } = $props();

	let abierto = $state(false);
	let enviando = $state(false);
	let listo = $state(false);
	let fallo = $state('');

	async function reportar(motivo: string) {
		enviando = true;
		fallo = '';
		try {
			const res = await fetch('/api/reportes', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ lugar_id: lugarId, motivo })
			});
			if (!res.ok) {
				const cuerpo = await res.json().catch(() => null);
				throw new Error(cuerpo?.message ?? 'No se pudo enviar el reporte');
			}
			listo = true;
		} catch (e) {
			fallo = e instanceof Error ? e.message : 'No se pudo enviar el reporte';
		} finally {
			enviando = false;
		}
	}
</script>

<!--
  Única escritura que puede hacer el público. Motivos de lista cerrada y sin
  texto libre: captura la señal de quien está parado ahí viendo la realidad,
  sin abrir una superficie de spam.
-->
<section class="mt-8 border-t border-stone-200 pt-5">
	{#if listo}
		<p class="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
			Gracias. Ya avisamos a quienes revisan la información.
		</p>
	{:else if !abierto}
		<button type="button" class="text-sm font-semibold text-stone-600 underline" onclick={() => (abierto = true)}>
			¿Esta información está desactualizada?
		</button>
	{:else}
		<p class="mb-2 text-sm font-semibold text-stone-800">¿Qué pasa con este lugar?</p>
		<div class="grid gap-2">
			{#each MOTIVOS_REPORTE as motivo (motivo.valor)}
				<button
					type="button"
					class="btn-secondary text-left"
					disabled={enviando}
					onclick={() => reportar(motivo.valor)}
				>
					{motivo.nombre}
				</button>
			{/each}
		</div>
		{#if fallo}
			<p class="mt-2 text-sm font-medium text-red-700">{fallo}</p>
		{/if}
		<button type="button" class="mt-2 text-sm text-stone-500 underline" onclick={() => (abierto = false)}>
			Cancelar
		</button>
	{/if}
</section>

<script lang="ts">
	import { ESTADO_POR_VALOR } from '$lib/constantes';
	import type { EstadoOperativo } from '$lib/types';

	let { estado, grande = false }: { estado: EstadoOperativo; grande?: boolean } = $props();

	const info = $derived(ESTADO_POR_VALOR.get(estado));
</script>

{#if info}
	<span
		class="inline-flex items-center gap-2 rounded-full border font-bold {info.clase} {grande
			? 'px-4 py-2 text-base'
			: 'px-3 py-1 text-sm'}"
	>
		<span class="h-2 w-2 shrink-0 rounded-full {info.punto}"></span>
		{info.corto}
	</span>
{/if}

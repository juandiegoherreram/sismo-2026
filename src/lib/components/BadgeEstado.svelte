<script lang="ts">
	import { ESTADO_POR_VALOR } from '$lib/constantes';
	import type { EstadoOperativo } from '$lib/types';

	let { estado }: { estado: EstadoOperativo } = $props();

	const info = $derived(ESTADO_POR_VALOR.get(estado));
</script>

<!--
  Un solo tamaño, el de la lista. La versión grande de la ficha ocupaba un
  renglón entero para decir «Operando» — una palabra que casi nunca cambia la
  decisión de nadie, cobrando el espacio de lo que sí: qué piden y dónde queda.
-->
{#if info}
	<span
		class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold {info.clase}"
	>
		<span class="h-2 w-2 shrink-0 rounded-full {info.punto}"></span>
		{info.corto}
	</span>
{/if}

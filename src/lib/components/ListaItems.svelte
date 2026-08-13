<script lang="ts">
	import { adivinarCategoria } from '$lib/categorizar';
	import { NECESIDADES, NECESIDAD_POR_VALOR, NIVEL_POR_VALOR, siguienteNivel } from '$lib/constantes';
	import type { EtiquetaNecesidad, ItemNuevo } from '$lib/types';

	let {
		items = $bindable([]),
		max = 40
	}: {
		items?: ItemNuevo[];
		max?: number;
	} = $props();

	let texto = $state('');

	// La categoría se adivina mientras escribe y se muestra antes de agregar:
	// quien ve "💊 Medicamentos" aparecer solo entiende de una que puede
	// corregirlo, sin que nadie le explique que existe una clasificación.
	const sugerida = $derived(adivinarCategoria(texto));

	function agregar() {
		const limpio = texto.trim().slice(0, 80);
		if (!limpio || items.length >= max) return;
		if (items.some((i) => i.texto.toLowerCase() === limpio.toLowerCase())) {
			texto = '';
			return;
		}

		items = [...items, { texto: limpio, categoria: adivinarCategoria(limpio), nivel: 'recibiendo' }];
		texto = '';
	}

	function alTeclear(e: KeyboardEvent) {
		// Enter agrega sin enviar el formulario que envuelve la lista.
		if (e.key === 'Enter') {
			e.preventDefault();
			agregar();
		}
	}

	function quitar(i: number) {
		items = items.filter((_, j) => j !== i);
	}

	function cambiarCategoria(i: number, valor: string) {
		items = items.map((item, j) =>
			j === i ? { ...item, categoria: (valor || null) as EtiquetaNecesidad | null } : item
		);
	}

	// Mismo ciclo de toques que las categorías del formulario: verde recibiendo,
	// rojo urgente, amarillo ya no. Un ítem siempre tiene nivel, así que el
	// ciclo nunca lo deja en null — vuelve al verde.
	function ciclarNivel(i: number) {
		items = items.map((item, j) =>
			j === i ? { ...item, nivel: siguienteNivel(item.nivel) ?? 'recibiendo' } : item
		);
	}

	function mover(i: number, salto: number) {
		const destino = i + salto;
		if (destino < 0 || destino >= items.length) return;
		const copia = [...items];
		[copia[i], copia[destino]] = [copia[destino], copia[i]];
		items = copia;
	}
</script>

<div>
	<div class="flex gap-2">
		<div class="min-w-0 flex-1">
			<input
				class="input"
				bind:value={texto}
				onkeydown={alTeclear}
				maxlength="80"
				disabled={items.length >= max}
				placeholder="Ej: pañales talla 2"
				aria-label="Agregar algo que necesitan"
			/>
			{#if texto.trim()}
				<p class="mt-1 text-xs text-stone-500">
					{#if sugerida}
						Se guarda como
						<span class="font-semibold text-stone-700">
							{NECESIDAD_POR_VALOR.get(sugerida)?.emoji}
							{NECESIDAD_POR_VALOR.get(sugerida)?.nombre}
						</span>
						— lo puede cambiar después.
					{:else}
						No adivinamos la categoría; se la puede poner al agregarlo.
					{/if}
				</p>
			{/if}
		</div>
		<button
			type="button"
			class="btn-secondary h-fit shrink-0"
			onclick={agregar}
			disabled={!texto.trim() || items.length >= max}
		>
			Agregar
		</button>
	</div>

	{#if items.length >= max}
		<p class="mt-2 text-sm text-amber-700">
			Llegó al máximo de {max} ítems. Quite alguno para agregar otro.
		</p>
	{/if}

	{#if items.length}
		<p class="mt-3 text-xs text-stone-500">
			Toque el color de cada uno: verde recibiendo, rojo urgente, amarillo ya no recibimos.
		</p>

		<!--
		  Un ítem = un renglón. El nivel, la categoría y el borrar caben al lado
		  del texto, así que una lista de veinte cosas se revisa de un vistazo en
		  vez de ocupar una pantalla entera de botones.
		-->
		<ul class="mt-1.5 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
			{#each items as item, i (item.texto)}
				{@const nivel = NIVEL_POR_VALOR.get(item.nivel)}
				<li class="flex items-center gap-2 px-2 py-1.5">
					<button
						type="button"
						class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold {nivel?.clase}"
						title="Cambiar a {NIVEL_POR_VALOR.get(siguienteNivel(item.nivel) ?? 'recibiendo')?.nombre}"
						aria-label="{item.texto}: {nivel?.nombre}. Toque para cambiar."
						onclick={() => ciclarNivel(i)}
					>
						<span class="h-2 w-2 rounded-full {nivel?.punto}"></span>
						{nivel?.corto}
					</button>

					<span class="min-w-0 flex-1 truncate text-sm font-medium text-stone-900" title={item.texto}>
						{item.texto}
					</span>

					<select
						class="w-28 shrink-0 rounded-lg border border-stone-200 bg-white py-1 text-xs text-stone-600"
						value={item.categoria ?? ''}
						aria-label="Categoría de {item.texto}"
						onchange={(e) => cambiarCategoria(i, e.currentTarget.value)}
					>
						<option value="">Sin cat.</option>
						{#each NECESIDADES as n (n.valor)}
							<option value={n.valor}>{n.emoji} {n.nombre}</option>
						{/each}
					</select>

					{#if items.length > 1}
						<span class="flex shrink-0 flex-col leading-none">
							<button
								type="button"
								class="px-1 text-[10px] text-stone-400 hover:text-stone-700 disabled:opacity-25"
								disabled={i === 0}
								aria-label="Subir {item.texto}"
								onclick={() => mover(i, -1)}>▲</button
							>
							<button
								type="button"
								class="px-1 text-[10px] text-stone-400 hover:text-stone-700 disabled:opacity-25"
								disabled={i === items.length - 1}
								aria-label="Bajar {item.texto}"
								onclick={() => mover(i, 1)}>▼</button
							>
						</span>
					{/if}

					<button
						type="button"
						class="shrink-0 px-1 text-sm text-stone-400 hover:text-red-700"
						aria-label="Quitar {item.texto}"
						onclick={() => quitar(i)}
					>
						✕
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-3 text-sm text-stone-500">
			Todavía no hay nada en la lista. Escriba lo que necesitan, una cosa por renglón.
		</p>
	{/if}
</div>

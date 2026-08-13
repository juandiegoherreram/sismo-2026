<script lang="ts">
	import BadgeEstado from './BadgeEstado.svelte';
	import Necesidades from './Necesidades.svelte';
	import { TIPO_POR_VALOR } from '$lib/constantes';
	import { actualizadoHace, estaViejo, formatoDistancia } from '$lib/formato';
	import type { LugarConNecesidades } from '$lib/types';

	let { lugar, distancia = null }: { lugar: LugarConNecesidades; distancia?: number | null } =
		$props();

	const tipo = $derived(TIPO_POR_VALOR.get(lugar.tipo));
	const viejo = $derived(estaViejo(lugar.actualizado_en));
	// Un sitio saturado o cerrado se atenúa: sigue visible, pero no compite.
	const apagado = $derived(lugar.estado_operativo === 'saturado' || lugar.estado_operativo === 'cerrado');

	// Lo urgente es lo único que cabe en la tarjeta. El resto está a un toque.
	const urgentes = $derived(lugar.items.filter((i) => i.nivel === 'urgente'));
</script>

<!--
  La tarjeta entera es un enlace a la ficha, no un acordeón. Un resumen que se
  despliega obliga a decidir dos veces —abrir y después entrar— y deja a la
  gente leyendo media ficha dentro de una lista. Acá la tarjeta dice lo justo
  para descartar o entrar, y entrar es un solo toque en cualquier parte.
-->
<article class="card overflow-hidden transition hover:border-stone-300 {apagado ? 'opacity-70' : ''}">
	<a class="block px-3.5 py-3.5" href="/lugar/{lugar.id}">
		<div class="flex items-start justify-between gap-2">
			<h2 class="text-base leading-snug font-bold text-stone-900">{lugar.nombre}</h2>
			{#if distancia !== null}
				<span class="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-800">
					a {formatoDistancia(distancia)}
				</span>
			{/if}
		</div>

		<div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
			<BadgeEstado estado={lugar.estado_operativo} />
			<span class="text-sm text-stone-600">
				<span aria-hidden="true">{tipo?.emoji}</span>
				{tipo?.nombre} · {lugar.ciudad}
			</span>
		</div>

		{#if lugar.necesidades.length}
			<div class="mt-2">
				<Necesidades necesidades={lugar.necesidades} mostrarNoRecibir={false} />
			</div>
		{/if}

		{#if urgentes.length}
			<p class="mt-2 text-sm text-stone-800">
				<span class="font-bold text-red-700">Piden ya:</span>
				{urgentes
					.slice(0, 3)
					.map((i) => i.texto)
					.join(', ')}{#if urgentes.length > 3}<span class="text-stone-500">
						y {urgentes.length - 3} más</span
					>{/if}
			</p>
		{/if}

		<!--
		  Dirección, horario y edad del dato en un solo renglón: son las tres
		  cosas que se leen de un vistazo para decidir si vale la pena entrar, y
		  separadas en tres líneas hacían la tarjeta el doble de larga. El
		  detalle fino de ubicación (torre, piso, portería) vive en la ficha:
		  acá no ayuda a decidir, solo estorba.
		-->
		<p class="mt-2 text-sm text-stone-500">
			{lugar.direccion}{#if lugar.horario}<span class="text-stone-400"> · 🕒 {lugar.horario}</span
				>{/if}<span class={viejo ? 'font-semibold text-amber-700' : 'text-stone-400'}>
				· {actualizadoHace(lugar.actualizado_en)}</span
			>
		</p>
	</a>
</article>

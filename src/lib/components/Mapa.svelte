<script lang="ts">
	import { onMount } from 'svelte';
	import type { Map as LeafletMap, Marker } from 'leaflet';
	import {
		CENTRO_COLOMBIA,
		ESTADO_POR_VALOR,
		NECESIDAD_POR_VALOR,
		NIVEL_POR_VALOR,
		TIPO_POR_VALOR
	} from '$lib/constantes';
	import { detalleUbicacion } from '$lib/formato';
	import type { EstadoOperativo, LugarConNecesidades } from '$lib/types';

	let {
		lugares = [],
		seleccionable = false,
		/**
		 * Vista fija, sin arrastrar ni acercar y sin globos: sirve para el
		 * recuadro de "dónde queda" dentro de una ficha, donde el mapa no es
		 * una herramienta sino una respuesta —"queda por acá"— y quien lo toca
		 * lo que quiere es salir hacia su app de navegación.
		 */
		estatico = false,
		lat = $bindable(null),
		lng = $bindable(null),
		alto = 'h-[60vh]'
	}: {
		lugares?: LugarConNecesidades[];
		seleccionable?: boolean;
		estatico?: boolean;
		lat?: number | null;
		lng?: number | null;
		alto?: string;
	} = $props();

	let contenedor: HTMLDivElement;
	let mapa: LeafletMap | undefined;
	let capa: import('leaflet').LayerGroup | undefined;
	let pin: Marker | undefined;
	let L: typeof import('leaflet');

	const COLOR_ESTADO: Record<EstadoOperativo, string> = {
		necesita_gente: '#10b981',
		estable: '#0ea5e9',
		saturado: '#f59e0b',
		cerrado: '#a8a29e'
	};

	function icono(lugar: LugarConNecesidades) {
		const emoji = TIPO_POR_VALOR.get(lugar.tipo)?.emoji ?? '📍';
		return L.divIcon({
			className: '',
			html: `<div style="background:${COLOR_ESTADO[lugar.estado_operativo]}"
			         class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-sm shadow-md">${emoji}</div>`,
			iconSize: [32, 32],
			iconAnchor: [16, 16]
		});
	}

	/**
	 * El globo dice lo mismo que la tarjeta de la lista y en el mismo orden —
	 * nombre, estado, qué piden, dónde — porque quien salta del mapa a la lista
	 * no debería tener que volver a leer distinto para decidir lo mismo.
	 */
	function popup(lugar: LugarConNecesidades): string {
		const estado = ESTADO_POR_VALOR.get(lugar.estado_operativo);
		const tipo = TIPO_POR_VALOR.get(lugar.tipo);
		// textContent-safe: el nombre lo escribe un tercero, no se interpola crudo.
		const escapar = (s: string) => s.replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`);

		// Lo puntual que piden pesa más que el conteo de categorías: "necesitan
		// pañales" mueve a alguien, "2 necesidades urgentes" no.
		const urgentes = lugar.items.filter((i) => i.nivel === 'urgente');
		const pedidos = urgentes.slice(0, 3).map((i) => escapar(i.texto));
		const masPedidos = urgentes.length - pedidos.length;

		const chips = lugar.necesidades
			.filter((n) => n.nivel !== 'no_recibir')
			.sort((a, b) => Number(b.nivel === 'urgente') - Number(a.nivel === 'urgente'))
			.slice(0, 4)
			.map((n) => {
				const info = NECESIDAD_POR_VALOR.get(n.etiqueta);
				const nivel = NIVEL_POR_VALOR.get(n.nivel);
				return `<span class="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${nivel?.clase}">${info?.emoji ?? ''} ${escapar(info?.nombre ?? '')}</span>`;
			})
			.join(' ');

		const detalle = detalleUbicacion(lugar);

		return `
			<div class="w-56 font-sans">
				<strong class="block text-sm leading-snug font-bold text-stone-900">${escapar(lugar.nombre)}</strong>

				<span class="mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${estado?.clase ?? ''}">
					<span class="h-1.5 w-1.5 rounded-full ${estado?.punto ?? ''}"></span>${escapar(estado?.corto ?? '')}
				</span>
				<span class="text-[11px] text-stone-600">${tipo?.emoji ?? ''} ${escapar(tipo?.nombre ?? '')} · ${escapar(lugar.ciudad)}</span>

				${chips ? `<div class="mt-1.5 flex flex-wrap gap-1">${chips}</div>` : ''}

				${
					pedidos.length
						? `<p class="mt-1.5 text-[11px] text-stone-800"><span class="font-bold text-red-700">Piden ya:</span> ${pedidos.join(', ')}${masPedidos > 0 ? ` y ${masPedidos} más` : ''}</p>`
						: ''
				}

				<p class="mt-1.5 text-[11px] text-stone-500">${escapar(lugar.direccion)}${detalle ? ` · ${escapar(detalle)}` : ''}</p>
				${lugar.horario ? `<p class="text-[11px] text-stone-500">🕒 ${escapar(lugar.horario)}</p>` : ''}

				<a href="/lugar/${lugar.id}" class="mt-1.5 inline-block text-[11px] font-bold text-brand-700">Ver ficha completa →</a>
			</div>
		`;
	}

	function pintar() {
		if (!mapa || !capa) return;
		capa.clearLayers();

		const conCoordenadas = lugares.filter((l) => l.lat !== null && l.lng !== null);
		for (const lugar of conCoordenadas) {
			const marca = L.marker([lugar.lat!, lugar.lng!], { icon: icono(lugar) });
			if (!estatico) marca.bindPopup(popup(lugar), { maxWidth: 260, minWidth: 224 });
			marca.addTo(capa);
		}

		// En modo estático la vista la fija quien lo monta y no se recalcula: un
		// solo punto centrado dice "acá queda" mejor que un encuadre automático.
		if (conCoordenadas.length && !estatico) {
			mapa.fitBounds(
				L.latLngBounds(conCoordenadas.map((l) => [l.lat!, l.lng!] as [number, number])),
				{ padding: [40, 40], maxZoom: 15 }
			);
		}
	}

	// Lo último que escribió el propio mapa. Sirve para distinguir un cambio que
	// nació acá (un toque, un arrastre) de uno que llegó de afuera —el buscador
	// de direcciones— y que sí exige mover la vista.
	let ultimoPropio: string | null = null;

	function fijar(punto: [number, number]) {
		lat = Number(punto[0].toFixed(6));
		lng = Number(punto[1].toFixed(6));
		ultimoPropio = `${lat},${lng}`;
	}

	function ponerPin(punto: [number, number]) {
		if (!mapa) return;
		if (pin) pin.setLatLng(punto);
		else pin = L.marker(punto, { draggable: true }).addTo(mapa);

		pin.off('dragend').on('dragend', () => {
			const p = pin!.getLatLng();
			fijar([p.lat, p.lng]);
		});
	}

	onMount(() => {
		let vivo = true;

		// Import dinámico: Leaflet toca `window` al cargarse y rompe el SSR.
		(async () => {
			L = await import('leaflet');
			await import('leaflet/dist/leaflet.css');
			if (!vivo) return;

			const inicio: [number, number] =
				lat !== null && lng !== null
					? [lat, lng]
					: (lugares.find((l) => l.lat !== null)
							? [lugares.find((l) => l.lat !== null)!.lat!, lugares.find((l) => l.lat !== null)!.lng!]
							: CENTRO_COLOMBIA);

			mapa = L.map(contenedor, {
				zoomControl: !estatico,
				dragging: !estatico,
				scrollWheelZoom: !estatico,
				doubleClickZoom: !estatico,
				touchZoom: !estatico,
				boxZoom: !estatico,
				keyboard: !estatico
			}).setView(inicio, estatico ? 16 : lat !== null ? 16 : 11);

			L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '&copy; OpenStreetMap'
			}).addTo(mapa);

			capa = L.layerGroup().addTo(mapa);
			pintar();

			if (seleccionable) {
				if (lat !== null && lng !== null) {
					ultimoPropio = `${lat},${lng}`;
					ponerPin([lat, lng]);
				}
				mapa.on('click', (e: import('leaflet').LeafletMouseEvent) => {
					fijar([e.latlng.lat, e.latlng.lng]);
					ponerPin([lat!, lng!]);
				});
			}
		})();

		return () => {
			vivo = false;
			mapa?.remove();
			mapa = undefined;
		};
	});

	// Repinta cuando cambian los filtros sin recrear el mapa.
	$effect(() => {
		void lugares;
		if (mapa) pintar();
	});

	// Coordenadas puestas desde afuera (el buscador de direcciones): se mueve el
	// pin y se acerca la vista. Si el cambio lo produjo el mapa mismo no se hace
	// nada, para no dar un brinco justo cuando alguien acaba de arrastrar el pin.
	$effect(() => {
		const actual = lat !== null && lng !== null ? `${lat},${lng}` : null;
		if (!seleccionable || !mapa || !actual || actual === ultimoPropio) return;

		ultimoPropio = actual;
		ponerPin([lat!, lng!]);
		mapa.setView([lat!, lng!], Math.max(mapa.getZoom(), 16));
	});
</script>

<!--
  `mapa-fijo` apaga los eventos de puntero en todo el árbol (ver app.css): el
  recuadro va dentro de un enlace a la app de mapas, y sin eso Leaflet se queda
  con el toque —el marcador cae justo en el centro, donde la gente toca— y el
  enlace nunca se dispara.
-->
<div
	bind:this={contenedor}
	class="w-full overflow-hidden rounded-2xl border border-stone-200 {alto} {estatico
		? 'mapa-fijo'
		: ''}"
></div>

{#if seleccionable}
	<p class="mt-2 text-sm text-stone-600">
		Toque el mapa para marcar la ubicación exacta{#if lat !== null}
			· <span class="font-mono text-xs">{lat}, {lng}</span>
			<button type="button" class="ml-1 underline" onclick={() => { lat = null; lng = null; pin?.remove(); pin = undefined; }}>
				quitar
			</button>
		{/if}
	</p>
{/if}

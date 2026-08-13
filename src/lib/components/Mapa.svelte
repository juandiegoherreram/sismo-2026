<script lang="ts">
	import { onMount } from 'svelte';
	import type { Map as LeafletMap, Marker } from 'leaflet';
	import { CENTRO_COLOMBIA, ESTADO_POR_VALOR, TIPO_POR_VALOR } from '$lib/constantes';
	import type { EstadoOperativo, LugarConNecesidades } from '$lib/types';

	let {
		lugares = [],
		seleccionable = false,
		lat = $bindable(null),
		lng = $bindable(null),
		alto = 'h-[60vh]'
	}: {
		lugares?: LugarConNecesidades[];
		seleccionable?: boolean;
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

	function popup(lugar: LugarConNecesidades): string {
		const estado = ESTADO_POR_VALOR.get(lugar.estado_operativo);
		const urgentes = lugar.necesidades.filter((n) => n.nivel === 'urgente').length;
		// textContent-safe: el nombre lo escribe un tercero, no se interpola crudo.
		const escapar = (s: string) => s.replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`);
		return `
			<strong style="font-size:14px">${escapar(lugar.nombre)}</strong><br>
			<span style="color:#57534e">${escapar(estado?.corto ?? '')}</span>
			${urgentes ? `<br><span style="color:#b91c1c">${urgentes} necesidad(es) urgente(s)</span>` : ''}
			<br><a href="/lugar/${lugar.id}" style="color:#0d7259;font-weight:600">Ver detalle →</a>
		`;
	}

	function pintar() {
		if (!mapa || !capa) return;
		capa.clearLayers();

		const conCoordenadas = lugares.filter((l) => l.lat !== null && l.lng !== null);
		for (const lugar of conCoordenadas) {
			L.marker([lugar.lat!, lugar.lng!], { icon: icono(lugar) })
				.bindPopup(popup(lugar))
				.addTo(capa);
		}

		if (conCoordenadas.length) {
			mapa.fitBounds(
				L.latLngBounds(conCoordenadas.map((l) => [l.lat!, l.lng!] as [number, number])),
				{ padding: [40, 40], maxZoom: 15 }
			);
		}
	}

	function ponerPin(punto: [number, number]) {
		if (!mapa) return;
		if (pin) pin.setLatLng(punto);
		else pin = L.marker(punto, { draggable: true }).addTo(mapa);

		pin.off('dragend').on('dragend', () => {
			const p = pin!.getLatLng();
			lat = Number(p.lat.toFixed(6));
			lng = Number(p.lng.toFixed(6));
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

			mapa = L.map(contenedor, { zoomControl: true }).setView(inicio, lat !== null ? 16 : 11);

			L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '&copy; OpenStreetMap'
			}).addTo(mapa);

			capa = L.layerGroup().addTo(mapa);
			pintar();

			if (seleccionable) {
				if (lat !== null && lng !== null) ponerPin([lat, lng]);
				mapa.on('click', (e: import('leaflet').LeafletMouseEvent) => {
					lat = Number(e.latlng.lat.toFixed(6));
					lng = Number(e.latlng.lng.toFixed(6));
					ponerPin([lat, lng]);
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
</script>

<div bind:this={contenedor} class="w-full overflow-hidden rounded-2xl border border-stone-200 {alto}">
</div>

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

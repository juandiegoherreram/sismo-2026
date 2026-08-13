<script lang="ts">
	interface Sugerencia {
		direccion: string;
		barrio: string | null;
		ciudad: string | null;
		departamento: string | null;
		lat: number;
		lng: number;
		descripcion: string;
	}

	let { onelegir }: { onelegir: (s: Sugerencia) => void } = $props();

	let consulta = $state('');
	let resultados = $state<Sugerencia[]>([]);
	let buscando = $state(false);
	let ubicando = $state(false);
	let aviso = $state('');

	// Una petición por búsqueda: la anterior se aborta para que una respuesta
	// lenta no pise los resultados de lo que la persona acaba de escribir.
	let corte: AbortController | undefined;
	let temporizador: ReturnType<typeof setTimeout> | undefined;

	async function consultar(url: string): Promise<Sugerencia[]> {
		corte?.abort();
		corte = new AbortController();
		const res = await fetch(url, { signal: corte.signal });
		if (!res.ok) throw new Error('falló la búsqueda');
		const datos = await res.json();
		return datos.resultados ?? [];
	}

	function alEscribir() {
		aviso = '';
		clearTimeout(temporizador);

		const q = consulta.trim();
		if (q.length < 3) {
			resultados = [];
			buscando = false;
			return;
		}

		// 400 ms: no se dispara una petición por tecla con red de emergencia.
		buscando = true;
		temporizador = setTimeout(async () => {
			try {
				resultados = await consultar(`/api/geo?q=${encodeURIComponent(q)}`);
				if (!resultados.length) aviso = 'No encontramos esa dirección. Márquela en el mapa.';
			} catch (e) {
				if ((e as Error).name === 'AbortError') return;
				aviso = 'La búsqueda no está disponible. Puede marcar el punto en el mapa.';
			} finally {
				buscando = false;
			}
		}, 400);
	}

	function elegir(s: Sugerencia) {
		onelegir(s);
		resultados = [];
		consulta = '';
		aviso = '';
	}

	function usarMiUbicacion() {
		if (!navigator.geolocation) {
			aviso = 'Este navegador no permite usar la ubicación.';
			return;
		}
		ubicando = true;
		aviso = '';

		navigator.geolocation.getCurrentPosition(
			async ({ coords }) => {
				try {
					const [encontrada] = await consultar(
						`/api/geo?lat=${coords.latitude}&lng=${coords.longitude}`
					);
					// Aunque el geocodificador no devuelva nada, el punto sirve: es
					// justo el dato que más cuesta conseguir a mano.
					elegir(
						encontrada ?? {
							direccion: '',
							barrio: null,
							ciudad: null,
							departamento: null,
							lat: coords.latitude,
							lng: coords.longitude,
							descripcion: ''
						}
					);
					aviso = 'Listo. Revise la dirección y complétela si le falta algo.';
				} catch {
					aviso = 'Tomamos el punto, pero no pudimos leer la dirección.';
				} finally {
					ubicando = false;
				}
			},
			() => {
				ubicando = false;
				aviso = 'No nos dio permiso de ubicación. Puede buscar la dirección o marcarla en el mapa.';
			},
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	}
</script>

<div>
	<div class="flex gap-2">
		<input
			class="input min-w-0 flex-1"
			bind:value={consulta}
			oninput={alEscribir}
			autocomplete="off"
			placeholder="Buscar dirección o nombre del sitio"
			aria-label="Buscar dirección"
		/>
		<button
			type="button"
			class="btn-secondary shrink-0 whitespace-nowrap"
			onclick={usarMiUbicacion}
			disabled={ubicando}
		>
			{ubicando ? 'Buscando…' : '📍 Estoy aquí'}
		</button>
	</div>

	{#if buscando}
		<p class="mt-2 text-sm text-stone-500">Buscando…</p>
	{/if}

	{#if aviso}
		<p class="mt-2 text-sm text-stone-600">{aviso}</p>
	{/if}

	{#if resultados.length}
		<ul class="mt-2 divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-300 bg-white">
			{#each resultados as s (s.descripcion + s.lat)}
				<li>
					<button
						type="button"
						class="w-full px-3 py-2.5 text-left text-sm hover:bg-stone-50"
						onclick={() => elegir(s)}
					>
						<span class="font-medium text-stone-900">{s.direccion}</span>
						{#if s.descripcion !== s.direccion}
							<span class="block text-stone-500">{s.descripcion}</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
		<p class="mt-1 text-sm text-stone-500">
			Elija el más cercano y ajuste el pin en el mapa si quedó corrido.
		</p>
	{/if}
</div>

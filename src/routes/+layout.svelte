<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { seccionDe } from '$lib/secciones';

	let { children, data } = $props();

	// La navegación conserva los filtros para que saltar de lista a mapa no
	// obligue a volver a filtrar.
	const query = $derived(page.url.search);
	const ruta = $derived(page.url.pathname);
	const publica = $derived(ruta === '/' || ruta === '/mapa');

	const seccion = $derived(seccionDe(ruta));

	// Con sesión abierta, el encabezado lleva de vuelta al panel propio: la
	// gente entra por el link, mira la lista pública y no encuentra cómo volver.
	const panel = $derived(
		data?.sesion ? (data.sesion.rol === 'veedor' ? '/veeduria' : '/mi-lugar') : null
	);

	/**
	 * Última limpieza del token de la URL.
	 *
	 * El servidor ya lo canjea por cookie y redirige sin él, pero Netlify le
	 * vuelve a pegar el query string de la petición a la `Location` —incluso
	 * absoluta—, así que el `?k=` reaparece en la barra. Acá se borra del
	 * historial, que es donde de verdad importa: es lo que queda si alguien
	 * comparte un pantallazo o le presta el celular a otro.
	 *
	 * Va en el cliente a propósito: ningún proxy puede volver a meter mano.
	 */
	$effect(() => {
		if (!page.url.searchParams.has('k')) return;

		const limpia = new URL(page.url);
		limpia.searchParams.delete('k');

		// Envuelto porque esto corre en el layout raíz: `replaceState` revienta
		// si el router todavía no terminó de arrancar, y ahí se caería toda la
		// app por una limpieza cosmética. Que quede el token en la barra es
		// molesto; que no cargue la pantalla, en una emergencia, es grave.
		try {
			replaceState(limpia.pathname + limpia.search, page.state);
		} catch {
			history.replaceState(history.state, '', limpia.pathname + limpia.search);
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={seccion.icono} />
	<meta name="theme-color" content={seccion.color} />
</svelte:head>

<div class="mx-auto min-h-dvh max-w-3xl">
	<header class="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
		<!-- Franja del color de la sección: confirma dónde está uno sin leer nada. -->
		<div class="h-1" style="background: {seccion.color}"></div>

		<div class="flex items-center justify-between gap-3 px-4 py-3">
			<a href="/{query}" class="flex items-center gap-2">
				<img src={seccion.icono} alt="" class="h-6 w-6 rounded-md" />
				<span class="font-bold tracking-tight text-stone-900">
					Sismo 2026{#if !publica}<span class="font-medium text-stone-500"> · {seccion.nombre}</span
						>{/if}
				</span>
			</a>

			<div class="flex items-center gap-3">
				{#if publica}
					<nav class="flex rounded-xl border border-stone-300 bg-white p-0.5 text-sm font-semibold">
						<a
							href="/{query}"
							class="rounded-lg px-3 py-1.5 {ruta === '/' ? 'bg-brand-700 text-white' : 'text-stone-600'}"
						>
							Lista
						</a>
						<a
							href="/mapa{query}"
							class="rounded-lg px-3 py-1.5 {ruta === '/mapa' ? 'bg-brand-700 text-white' : 'text-stone-600'}"
						>
							Mapa
						</a>
					</nav>
				{/if}

				{#if panel && !ruta.startsWith(panel)}
					<a href={panel} class="shrink-0 text-sm font-semibold text-brand-700 underline">
						{data.sesion?.rol === 'veedor' ? 'Veeduría' : 'Mi lugar'}
					</a>
				{/if}
			</div>
		</div>
	</header>

	{@render children()}

	<footer class="mt-12 border-t border-stone-200 px-4 py-6 text-sm text-stone-500">
		<p>
			Información reportada por los mismos centros y revisada por voluntarios. Puede haber
			desactualizaciones.
		</p>
		<p class="mt-2">
			¿Coordina un punto y quiere aparecer acá?
			<a class="font-semibold text-brand-700 underline" href="/registrar">Solicite su acceso</a>.
			¿Ya tiene link?
			<a class="font-semibold text-brand-700 underline" href="/entrar">Entre acá</a>.
		</p>

		<!--
		  Hábeas data (Ley 1581 de 2012). Va plegado y no en una página aparte
		  porque nadie navega hasta una política de datos, pero sí la abre desde
		  donde está si le da curiosidad. El texto es corto a propósito: describe
		  lo que la app de verdad guarda, que es poco.
		-->
		<details class="mt-4">
			<summary class="cursor-pointer font-semibold text-stone-600">Tratamiento de datos</summary>
			<div class="mt-2 space-y-2 text-xs leading-relaxed">
				<p>
					Este directorio publica datos de <strong>puntos de ayuda</strong>, no de personas: nombre
					del sitio, dirección, horario y el contacto que su responsable decide hacer público. Quien
					registra un punto autoriza esa publicación y puede corregirla o pedir que se baje en
					cualquier momento desde su propio acceso.
				</p>
				<p>
					De quien consulta no se pide ni se guarda nombre, correo ni teléfono. La ubicación, si la
					activa, se usa solo en su navegador para ordenar la lista por cercanía: no se envía ni se
					almacena. De quien reporta un dato desactualizado se guarda únicamente una huella
					irreversible de su dirección IP, y solo para evitar reportes masivos.
				</p>
				<p>
					La finalidad es única: sostener y moderar este directorio durante la emergencia. Los datos
					no se venden, ni se ceden a terceros, ni se usan para publicidad o perfilamiento. Para
					conocer, actualizar, rectificar o suprimir información —incluida la de un punto ya
					publicado— escriba al contacto del equipo.
				</p>
			</div>
		</details>
	</footer>
</div>

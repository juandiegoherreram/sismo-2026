import type { Token } from '$lib/types';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			/** Token de la sesión, puesto por hooks.server.ts. Null si no hay. */
			acceso: Token | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

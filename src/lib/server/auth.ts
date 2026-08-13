import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { supabase } from './supabase';
import type { Token } from '$lib/types';

export const COOKIE_ACCESO = 'sismo_acceso';

/**
 * El token es una capability key: quien tiene el link edita su lugar. Se guarda
 * solo el hash, así que una filtración de la base no entrega ningún acceso.
 */
export async function hashToken(token: string): Promise<string> {
	const bytes = new TextEncoder().encode(token);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Token nuevo en base32 sin vocales: no se forman palabras y se dicta por teléfono. */
export function generarToken(): string {
	const alfabeto = '0123456789BCDFGHJKLMNPQRSTVWXZ';
	const bytes = crypto.getRandomValues(new Uint8Array(20));
	return [...bytes].map((b) => alfabeto[b % alfabeto.length]).join('');
}

/** Devuelve el token activo con ese valor, o null. La usa el hook de sesión. */
export async function buscarTokenActivo(valor: string): Promise<Token | null> {
	if (!valor) return null;
	const { data } = await supabase
		.from('tokens')
		.select('*')
		.eq('token_hash', await hashToken(valor))
		.eq('estado', 'activo')
		.maybeSingle();
	return (data as Token | null) ?? null;
}

/**
 * De dónde sale el acceso de una petición, en orden:
 *   1. `locals.acceso` — la sesión que el hook ya resolvió desde la cookie.
 *   2. La cabecera `x-token` — para llamadas de API sueltas y pruebas.
 *
 * El `?k=` de la URL no aparece acá a propósito: lo consume el hook y lo
 * cambia por cookie antes de que cualquier ruta lo vea.
 */
export async function accesoDe(event: RequestEvent): Promise<Token | null> {
	if (event.locals.acceso) return event.locals.acceso;

	const cabecera = event.request.headers.get('x-token')?.trim();
	if (cabecera) return buscarTokenActivo(cabecera);

	return null;
}

/** Para endpoints de API: falla con 401 si no hay sesión. */
export async function requireAcceso(event: RequestEvent): Promise<Token> {
	const token = await accesoDe(event);
	if (!token) throw error(401, 'Su sesión se cerró. Vuelva a abrir el link de acceso.');
	return token;
}

export async function requireVeedor(event: RequestEvent): Promise<Token> {
	const token = await requireAcceso(event);
	if (token.rol !== 'veedor') throw error(403, 'Solo veeduría puede hacer esto');
	return token;
}

/** Editor que ya reclamó su lugar. Falla si todavía no registró ninguno. */
export async function requireLugar(event: RequestEvent): Promise<{ token: Token; lugarId: string }> {
	const token = await requireAcceso(event);
	if (!token.lugar_id) throw error(409, 'Todavía no ha registrado su lugar');
	return { token, lugarId: token.lugar_id };
}

/**
 * Para `load` de páginas: sin sesión no se muestra un 401 seco, se manda a
 * /entrar, que explica qué hacer y deja pegar el link.
 */
export function requireSesion(event: RequestEvent): Token {
	if (!event.locals.acceso) throw redirect(303, '/entrar');
	return event.locals.acceso;
}

export function requireSesionVeedor(event: RequestEvent): Token {
	const token = requireSesion(event);
	if (token.rol !== 'veedor') throw error(403, 'Este acceso no es de veeduría');
	return token;
}

/** Marca que el token se usó — le sirve a veeduría para ver quién está vivo. */
export async function marcarUso(tokenId: string): Promise<void> {
	await supabase.from('tokens').update({ usado_en: new Date().toISOString() }).eq('id', tokenId);
}

export async function registrarEdicion(
	lugarId: string | null,
	tokenId: string | null,
	accion: string,
	diff?: Record<string, unknown>
): Promise<void> {
	await supabase.from('ediciones').insert({
		lugar_id: lugarId,
		token_id: tokenId,
		accion,
		diff: diff ?? null
	});
}

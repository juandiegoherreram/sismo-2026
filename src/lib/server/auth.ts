import { error } from '@sveltejs/kit';
import { supabase } from './supabase';
import type { Token } from '$lib/types';

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

export function leerToken(url: URL, request?: Request): string | null {
	const deUrl = url.searchParams.get('k');
	if (deUrl) return deUrl.trim();
	return request?.headers.get('x-token')?.trim() || null;
}

async function buscarToken(valor: string): Promise<Token | null> {
	const { data } = await supabase
		.from('tokens')
		.select('*')
		.eq('token_hash', await hashToken(valor))
		.eq('estado', 'activo')
		.maybeSingle();
	return data as Token | null;
}

export async function requireToken(valor: string | null | undefined): Promise<Token> {
	if (!valor) throw error(401, 'Necesita el link de acceso que le enviamos');
	const token = await buscarToken(valor);
	if (!token) throw error(401, 'Este link no es válido o fue revocado');
	return token;
}

export async function requireVeedor(valor: string | null | undefined): Promise<Token> {
	const token = await requireToken(valor);
	if (token.rol !== 'veedor') throw error(403, 'Solo veeduría puede hacer esto');
	return token;
}

/** Editor que ya reclamó su lugar. Falla si todavía no registró ninguno. */
export async function requireLugarDeToken(valor: string | null | undefined): Promise<{
	token: Token;
	lugarId: string;
}> {
	const token = await requireToken(valor);
	if (!token.lugar_id) throw error(409, 'Todavía no ha registrado su lugar');
	return { token, lugarId: token.lugar_id };
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

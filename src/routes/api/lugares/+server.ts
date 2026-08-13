import { error, json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { leerToken, marcarUso, registrarEdicion, requireToken } from '$lib/server/auth';
import { guardarNecesidades } from '$lib/server/lugares';
import {
	validateCoordenadas,
	validateEstadoOperativo,
	validateNecesidades,
	validateOptionalText,
	validateText,
	validateTipo
} from '$lib/server/validate';
import type { RequestHandler } from './$types';

/** Reclamo del lugar: un token solo puede hacer esto una vez. */
export const POST: RequestHandler = async ({ request, url }) => {
	const token = await requireToken(leerToken(url, request));

	if (token.lugar_id) {
		throw error(409, 'Este acceso ya tiene un lugar registrado. Solo se permite uno por token.');
	}

	const cuerpo = await request.json().catch(() => null);
	if (!cuerpo) throw error(400, 'Petición inválida');

	const { lat, lng } = validateCoordenadas(cuerpo.lat, cuerpo.lng);
	const necesidades = validateNecesidades(cuerpo.necesidades);

	const nuevo = {
		nombre: validateText(cuerpo.nombre, 'El nombre', 120, 3),
		tipo: validateTipo(cuerpo.tipo),
		ciudad: validateText(cuerpo.ciudad, 'La ciudad', 80, 2),
		departamento: validateText(cuerpo.departamento, 'El departamento', 80, 2),
		direccion: validateText(cuerpo.direccion, 'La dirección', 200, 5),
		referencia: validateOptionalText(cuerpo.referencia, 200),
		horario: validateOptionalText(cuerpo.horario, 120),
		contacto_publico: validateOptionalText(cuerpo.contacto_publico, 80),
		nota: validateOptionalText(cuerpo.nota, 140),
		estado_operativo: validateEstadoOperativo(cuerpo.estado_operativo ?? 'estable'),
		lat,
		lng
	};

	const { data, error: err } = await supabase.from('lugares').insert(nuevo).select('id').single();
	if (err || !data) throw error(500, 'No se pudo registrar el lugar');

	const lugarId = (data as { id: string }).id;

	// Amarrar el token al lugar es lo que impone "un token = un lugar". Si esto
	// falla, se borra el lugar para no dejar huérfanos que nadie pueda editar.
	const { error: errToken } = await supabase
		.from('tokens')
		.update({ lugar_id: lugarId, usado_en: new Date().toISOString() })
		.eq('id', token.id)
		.is('lugar_id', null);

	if (errToken) {
		await supabase.from('lugares').delete().eq('id', lugarId);
		throw error(409, 'Este acceso ya tiene un lugar registrado');
	}

	await guardarNecesidades(lugarId, necesidades);
	await registrarEdicion(lugarId, token.id, 'crear', { nombre: nuevo.nombre });

	return json({ id: lugarId }, { status: 201 });
};

/** Edición completa del lugar propio. */
export const PATCH: RequestHandler = async ({ request, url }) => {
	const token = await requireToken(leerToken(url, request));
	if (!token.lugar_id) throw error(409, 'Todavía no ha registrado su lugar');

	const cuerpo = await request.json().catch(() => null);
	if (!cuerpo) throw error(400, 'Petición inválida');

	const { lat, lng } = validateCoordenadas(cuerpo.lat, cuerpo.lng);
	const necesidades = validateNecesidades(cuerpo.necesidades);

	const cambios = {
		nombre: validateText(cuerpo.nombre, 'El nombre', 120, 3),
		tipo: validateTipo(cuerpo.tipo),
		ciudad: validateText(cuerpo.ciudad, 'La ciudad', 80, 2),
		departamento: validateText(cuerpo.departamento, 'El departamento', 80, 2),
		direccion: validateText(cuerpo.direccion, 'La dirección', 200, 5),
		referencia: validateOptionalText(cuerpo.referencia, 200),
		horario: validateOptionalText(cuerpo.horario, 120),
		contacto_publico: validateOptionalText(cuerpo.contacto_publico, 80),
		nota: validateOptionalText(cuerpo.nota, 140),
		estado_operativo: validateEstadoOperativo(cuerpo.estado_operativo),
		lat,
		lng,
		actualizado_en: new Date().toISOString()
	};

	const { error: err } = await supabase.from('lugares').update(cambios).eq('id', token.lugar_id);
	if (err) throw error(500, 'No se pudieron guardar los cambios');

	await guardarNecesidades(token.lugar_id, necesidades);
	await marcarUso(token.id);
	await registrarEdicion(token.lugar_id, token.id, 'editar', cambios);

	return json({ ok: true });
};

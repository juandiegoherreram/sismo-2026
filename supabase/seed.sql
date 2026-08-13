-- Datos de ejemplo para probar la app antes de tener registros reales.
-- NO correr en producción: son lugares inventados.
--
-- Trae además un token de veeduría de arranque, porque los tokens solo se
-- generan desde /veeduria y sin uno no hay forma de entrar la primera vez.

insert into lugares
  (nombre, tipo, ciudad, departamento, direccion, referencia, lat, lng,
   horario, contacto_publico, nota, estado_operativo, estado_moderacion)
values
  ('Acopio Estadio El Campín', 'acopio', 'Bogotá', 'Cundinamarca',
   'Cra 30 # 57-60', 'Portería norte, junto a las taquillas', 4.6457, -74.0776,
   '7am a 8pm', '3001234567',
   'No traer ropa usada. Necesitamos con urgencia agua embotellada.',
   'necesita_gente', 'aprobado'),

  ('Movistar Arena — Punto de recepción', 'acopio', 'Bogotá', 'Cundinamarca',
   'Diagonal 61C # 26-36', 'Entrada de servicio, costado oriental', 4.6491, -74.0768,
   '8am a 6pm', null,
   'Ya tenemos suficiente ropa y comida no perecedera. Mejor vayan a otros puntos.',
   'saturado', 'aprobado'),

  ('Banco de Sangre Cruz Roja', 'sangre', 'Bogotá', 'Cundinamarca',
   'Av. Carrera 68 # 68B-31', null, 4.6588, -74.0921,
   '7am a 7pm', '3109876543',
   'Se necesitan donantes O- y O+. Venga desayunado e hidratado.',
   'necesita_gente', 'aprobado'),

  ('Brigada de voluntarios Suba', 'voluntariado', 'Bogotá', 'Cundinamarca',
   'Calle 145 # 91-19', 'Frente al parque principal', 4.7443, -74.0836,
   '6am a 6pm', null,
   'Buscamos gente con experiencia en primeros auxilios y palas.',
   'necesita_gente', 'aprobado'),

  ('Albergue temporal Colegio San Pedro', 'albergue', 'Villavicencio', 'Meta',
   'Calle 15 # 22-40', 'Coliseo del colegio', 4.1420, -73.6266,
   'Abierto 24 horas', '3205551212',
   'Tenemos cupo. Necesitamos colchonetas y cobijas.',
   'necesita_gente', 'aprobado'),

  ('Acopio Parroquia Santa Ana', 'acopio', 'Villavicencio', 'Meta',
   'Cra 40 # 26-15', null, 4.1370, -73.6350,
   '8am a 5pm', null, null,
   'estable', 'aprobado'),

  ('Punto ciudadano sin verificar', 'acopio', 'Bogotá', 'Cundinamarca',
   'Calle 100 # 15-20', null, null, null,
   null, null, 'Entrada de prueba para ver la cola de moderación.',
   'estable', 'pendiente');

-- Necesidades de ejemplo, resueltas por nombre para no depender de los uuid.
insert into lugar_necesidades (lugar_id, etiqueta, nivel)
select id, 'agua'::etiqueta_necesidad, 'urgente'::nivel_necesidad
  from lugares where nombre = 'Acopio Estadio El Campín'
union all
select id, 'ropa', 'no_recibir' from lugares where nombre = 'Acopio Estadio El Campín'
union all
select id, 'comida', 'recibiendo' from lugares where nombre = 'Acopio Estadio El Campín'
union all
select id, 'ropa', 'no_recibir' from lugares where nombre = 'Movistar Arena — Punto de recepción'
union all
select id, 'comida', 'no_recibir' from lugares where nombre = 'Movistar Arena — Punto de recepción'
union all
select id, 'voluntarios', 'urgente' from lugares where nombre = 'Brigada de voluntarios Suba'
union all
select id, 'herramientas', 'urgente' from lugares where nombre = 'Brigada de voluntarios Suba'
union all
select id, 'aseo', 'urgente' from lugares where nombre = 'Albergue temporal Colegio San Pedro'
union all
select id, 'medicamentos', 'recibiendo' from lugares where nombre = 'Albergue temporal Colegio San Pedro';

-- El primer acceso de veeduría NO va acá: un token fijo en el repo es un
-- acceso de administración público. Genérelo con:
--
--   node scripts/token-veedor.mjs
--
-- Ese script imprime un token aleatorio y el INSERT con su hash para pegar en
-- el SQL editor de Supabase. Desde /veeduria se generan todos los demás.

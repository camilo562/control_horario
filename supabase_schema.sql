-- =====================================================================
-- 🧾 SAMMERS-JEANS • CONTROL HORARIO Y REGISTRO DE JORNADA
-- ESTRUCTURA DE BASE DE DATOS Y POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. LIMPIEZA DE TABLAS PREVIAS (Para re-ejecuciones limpias)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS pausas CASCADE;
DROP TABLE IF EXISTS jornadas CASCADE;
DROP TABLE IF EXISTS auditoria_logs CASCADE;
DROP TABLE IF EXISTS anuncios CASCADE;
DROP TABLE IF EXISTS motivos_pausa CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ---------------------------------------------------------------------
-- 2. CREACIÓN DE TABLAS
-- ---------------------------------------------------------------------

-- TABLA: usuarios
CREATE TABLE usuarios (
    id VARCHAR(100) PRIMARY KEY, -- Mapeado con ID de Auth o códigos secuenciales
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    rol TEXT NOT NULL CHECK (rol IN ('Empleado', 'Administrador')),
    avatar VARCHAR(10) NOT NULL,
    cargo TEXT,
    telefono_codigo_pais VARCHAR(8),
    telefono_numero VARCHAR(30),
    telefono_whatsapp VARCHAR(40) UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    face_descriptor JSONB DEFAULT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- TABLA: motivos_pausa
CREATE TABLE motivos_pausa (
    id VARCHAR(50) PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- TABLA: jornadas
CREATE TABLE jornadas (
    id VARCHAR(100) PRIMARY KEY,
    usuario_id VARCHAR(100) REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_entrada TIMESTAMP WITH TIME ZONE NOT NULL,
    hora_salida TIMESTAMP WITH TIME ZONE,
    estado TEXT NOT NULL CHECK (estado IN ('activo', 'pausado', 'finalizado')),
    tiempo_neto INTEGER NOT NULL DEFAULT 0, -- acumulado en segundos
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- TABLA: pausas
CREATE TABLE pausas (
    id VARCHAR(100) PRIMARY KEY,
    jornada_id VARCHAR(100) REFERENCES jornadas(id) ON DELETE CASCADE NOT NULL,
    motivo TEXT NOT NULL,
    hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    hora_fin TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- TABLA: auditoria_logs
CREATE TABLE auditoria_logs (
    id VARCHAR(100) PRIMARY KEY,
    admin_id VARCHAR(100) REFERENCES usuarios(id) ON DELETE SET NULL,
    admin_nombre TEXT NOT NULL,
    usuario_nombre TEXT NOT NULL,
    jornada_id VARCHAR(100) NOT NULL,
    campo_modificado TEXT NOT NULL,
    valor_anterior TEXT NOT NULL,
    valor_nuevo TEXT NOT NULL,
    motivo_edicion TEXT NOT NULL,
    fecha_cambio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- TABLA: anuncios
CREATE TABLE anuncios (
    id VARCHAR(50) PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    color TEXT NOT NULL CHECK (color IN ('blue', 'yellow', 'green', 'red', 'slate')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ---------------------------------------------------------------------
-- 3. CREACIÓN DE ÍNDICES PARA OPTIMIZACIÓN
-- ---------------------------------------------------------------------
CREATE INDEX idx_usuarios_telefono_whatsapp ON usuarios(telefono_whatsapp);
CREATE INDEX idx_jornadas_usuario_id ON jornadas(usuario_id);
CREATE INDEX idx_jornadas_fecha ON jornadas(fecha);
CREATE INDEX idx_pausas_jornada_id ON pausas(jornada_id);

-- ---------------------------------------------------------------------
-- 4. HABILITACIÓN DE SEGURIDAD RLS (Regla 3.2 - CRÍTICO)
-- ---------------------------------------------------------------------
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivos_pausa ENABLE ROW LEVEL SECURITY;
ALTER TABLE jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pausas ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE anuncios ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 5. POLÍTICAS DE SEGURIDAD (RLS)
-- ---------------------------------------------------------------------

-- TABLA: usuarios
CREATE POLICY "Cualquier usuario autenticado puede leer usuarios" 
    ON usuarios FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios pueden crear su propio perfil inicial"
    ON usuarios FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid()::text);

CREATE POLICY "Solo administradores pueden modificar usuarios" 
    ON usuarios FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid()::text AND u.rol = 'Administrador'))
    WITH CHECK (EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid()::text AND u.rol = 'Administrador'));

-- TABLA: motivos_pausa
CREATE POLICY "Cualquier usuario puede leer motivos de pausa" 
    ON motivos_pausa FOR SELECT TO authenticated USING (true);

CREATE POLICY "Solo administradores pueden gestionar motivos de pausa" 
    ON motivos_pausa FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid()::text AND u.rol = 'Administrador'))
    WITH CHECK (EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid()::text AND u.rol = 'Administrador'));

-- TABLA: jornadas
CREATE POLICY "Empleados pueden ver sus propias jornadas" 
    ON jornadas FOR SELECT TO authenticated 
    USING (usuario_id = auth.uid()::text OR EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid()::text AND u.rol = 'Administrador'));

CREATE POLICY "Empleados pueden registrar sus jornadas" 
    ON jornadas FOR INSERT TO authenticated 
    WITH CHECK (usuario_id = auth.uid()::text);

CREATE POLICY "Empleados pueden actualizar sus jornadas activas" 
    ON jornadas FOR UPDATE TO authenticated 
    USING (usuario_id = auth.uid()::text OR EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid()::text AND u.rol = 'Administrador'))
    WITH CHECK (usuario_id = auth.uid()::text OR EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid()::text AND u.rol = 'Administrador'));

-- TABLA: pausas
CREATE POLICY "Usuarios pueden ver pausas asociadas a sus jornadas" 
    ON pausas FOR SELECT TO authenticated 
    USING (
        EXISTS (SELECT 1 FROM jornadas j WHERE j.id = pausas.jornada_id AND j.usuario_id = auth.uid()::text)
        OR EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid()::text AND u.rol = 'Administrador')
    );

CREATE POLICY "Usuarios pueden registrar pausas asociadas a sus jornadas" 
    ON pausas FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (SELECT 1 FROM jornadas j WHERE j.id = pausas.jornada_id AND j.usuario_id = auth.uid()::text)
    );

CREATE POLICY "Usuarios pueden actualizar pausas asociadas a sus jornadas" 
    ON pausas FOR UPDATE TO authenticated 
    USING (
        EXISTS (SELECT 1 FROM jornadas j WHERE j.id = pausas.jornada_id AND j.usuario_id = auth.uid()::text)
        OR EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid()::text AND u.rol = 'Administrador')
    );

-- TABLA: auditoria_logs
CREATE POLICY "Cualquier usuario puede leer auditorías" 
    ON auditoria_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Solo administradores pueden insertar registros de auditoría" 
    ON auditoria_logs FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid()::text AND u.rol = 'Administrador'));

-- TABLA: anuncios
CREATE POLICY "Cualquier usuario puede leer anuncios" 
    ON anuncios FOR SELECT TO authenticated USING (true);

CREATE POLICY "Solo administradores pueden gestionar anuncios" 
    ON anuncios FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid()::text AND u.rol = 'Administrador'))
    WITH CHECK (EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid()::text AND u.rol = 'Administrador'));

-- ---------------------------------------------------------------------
-- 5.1. TRIGGER: CREAR PERFIL PUBLICO AL REGISTRARSE EN SUPABASE AUTH
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metadata JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  profile_name TEXT := COALESCE(NULLIF(metadata->>'nombre', ''), split_part(NEW.email, '@', 1));
  clean_avatar TEXT := UPPER(LEFT(REGEXP_REPLACE(profile_name, '[^[:alnum:]]', '', 'g'), 2));
BEGIN
  INSERT INTO public.usuarios (
    id,
    nombre,
    email,
    rol,
    avatar,
    cargo,
    telefono_codigo_pais,
    telefono_numero,
    telefono_whatsapp,
    activo
  )
  VALUES (
    NEW.id::text,
    profile_name,
    NEW.email,
    CASE
      WHEN metadata->>'rol' IN ('Empleado', 'Administrador') THEN metadata->>'rol'
      ELSE 'Empleado'
    END,
    COALESCE(NULLIF(clean_avatar, ''), 'US'),
    COALESCE(NULLIF(metadata->>'cargo', ''), 'Operario de Confeccion'),
    NULLIF(metadata->>'telefono_codigo_pais', ''),
    NULLIF(metadata->>'telefono_numero', ''),
    NULLIF(metadata->>'telefono_whatsapp', ''),
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    email = EXCLUDED.email,
    rol = EXCLUDED.rol,
    avatar = EXCLUDED.avatar,
    cargo = EXCLUDED.cargo,
    telefono_codigo_pais = EXCLUDED.telefono_codigo_pais,
    telefono_numero = EXCLUDED.telefono_numero,
    telefono_whatsapp = EXCLUDED.telefono_whatsapp,
    activo = TRUE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();


-- ---------------------------------------------------------------------
-- 6. POBLAR DATOS INICIALES (Mock Data Semilla)
-- ---------------------------------------------------------------------

-- Usuarios Iniciales
INSERT INTO usuarios (id, nombre, email, rol, avatar, cargo, activo) VALUES
('u-1', 'Carlos Pérez', 'carlos.perez@sammersjeans.com', 'Empleado', 'CP', 'Operario de Confección', TRUE),
('u-2', 'Laura Gómez', 'laura.gomez@sammersjeans.com', 'Administrador', 'LG', 'Directora de Operaciones / RRHH', TRUE),
('u-3', 'Juan Torres', 'juan.torres@sammersjeans.com', 'Empleado', 'JT', 'Auxiliar de Logística', TRUE),
('u-4', 'Valeria Restrepo', 'valeria.restrepo@sammersjeans.com', 'Empleado', 'VR', 'Diseñadora de Moda', FALSE);

-- Motivos de Pausa
INSERT INTO motivos_pausa (id, nombre, activo) VALUES
('m-1', 'Almuerzo', TRUE),
('m-2', 'Pausa Activa / Break', TRUE),
('m-3', 'Asunto Médico', TRUE),
('m-4', 'Diligencia Personal', TRUE),
('m-5', 'Capacitación', TRUE);

-- Anuncios Corporativos
INSERT INTO anuncios (id, titulo, descripcion, color) VALUES
('a-1', 'Nuevo diseño disponible', 'Interfaz mejorada en el sistema de registro.', 'blue'),
('a-2', 'Proceso operativo actualizado', 'Cambios en el flujo de trabajo en confección de jeans baggy.', 'yellow'),
('a-3', 'Entrega de equipos de seguridad', 'Equipo disponible para recolección en almacén general.', 'green');

-- Jornadas de Prueba (Últimos 5 días laborados de Carlos y Juan)
-- Carlos Pérez (u-1)
INSERT INTO jornadas (id, usuario_id, fecha, hora_entrada, hora_salida, estado, tiempo_neto) VALUES
('s-u-1-1', 'u-1', CURRENT_DATE - INTERVAL '1 day', (CURRENT_DATE - INTERVAL '1 day' + TIME '08:00:00'), (CURRENT_DATE - INTERVAL '1 day' + TIME '17:00:00'), 'finalizado', 28800),
('s-u-1-2', 'u-1', CURRENT_DATE - INTERVAL '2 days', (CURRENT_DATE - INTERVAL '2 days' + TIME '08:00:00'), (CURRENT_DATE - INTERVAL '2 days' + TIME '17:00:00'), 'finalizado', 28800),
('s-u-1-3', 'u-1', CURRENT_DATE - INTERVAL '3 days', (CURRENT_DATE - INTERVAL '3 days' + TIME '08:00:00'), (CURRENT_DATE - INTERVAL '3 days' + TIME '17:00:00'), 'finalizado', 28800);

-- Juan Torres (u-3)
INSERT INTO jornadas (id, usuario_id, fecha, hora_entrada, hora_salida, estado, tiempo_neto) VALUES
('s-u-3-1', 'u-3', CURRENT_DATE - INTERVAL '1 day', (CURRENT_DATE - INTERVAL '1 day' + TIME '08:00:00'), (CURRENT_DATE - INTERVAL '1 day' + TIME '17:00:00'), 'finalizado', 28800),
('s-u-3-2', 'u-3', CURRENT_DATE - INTERVAL '2 days', (CURRENT_DATE - INTERVAL '2 days' + TIME '08:00:00'), (CURRENT_DATE - INTERVAL '2 days' + TIME '17:00:00'), 'finalizado', 28800);

-- Pausas de Prueba
-- Carlos Pérez - Jornada 1
INSERT INTO pausas (id, jornada_id, motivo, hora_inicio, hora_fin) VALUES
('p-u-1-1-1', 's-u-1-1', 'Almuerzo', (CURRENT_DATE - INTERVAL '1 day' + TIME '12:00:00'), (CURRENT_DATE - INTERVAL '1 day' + TIME '13:00:00'));

-- Juan Torres - Jornada 1
INSERT INTO pausas (id, jornada_id, motivo, hora_inicio, hora_fin) VALUES
('p-u-3-1-1', 's-u-3-1', 'Almuerzo', (CURRENT_DATE - INTERVAL '1 day' + TIME '12:00:00'), (CURRENT_DATE - INTERVAL '1 day' + TIME '13:00:00'));

-- Auditoría Inicial
INSERT INTO auditoria_logs (id, admin_id, admin_nombre, usuario_nombre, jornada_id, campo_modificado, valor_anterior, valor_nuevo, motivo_edicion, fecha_cambio) VALUES
('log-1', 'u-2', 'Laura Gómez', 'Carlos Pérez', 's-u-1-1', 'Hora Salida', '17:00:00', '17:30:00', 'Empleado olvidó registrar la salida al quedarse a terminar lote de corte.', CURRENT_TIMESTAMP - INTERVAL '1 day');

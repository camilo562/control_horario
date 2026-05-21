CREATE DATABASE IF NOT EXISTS HORARIOS
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE HORARIOS;

CREATE TABLE IF NOT EXISTS usuarios (
  id VARCHAR(100) PRIMARY KEY,
  nombre TEXT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  rol ENUM('Empleado', 'Administrador') NOT NULL,
  avatar VARCHAR(10) NOT NULL,
  cargo TEXT NULL,
  telefono_codigo_pais VARCHAR(8) NULL,
  telefono_numero VARCHAR(30) NULL,
  telefono_whatsapp VARCHAR(40) NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  face_descriptor JSON NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuarios_telefono_whatsapp (telefono_whatsapp),
  INDEX idx_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS motivos_pausa (
  id VARCHAR(50) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jornadas (
  id VARCHAR(100) PRIMARY KEY,
  usuario_id VARCHAR(100) NOT NULL,
  fecha DATE NOT NULL,
  hora_entrada DATETIME(3) NOT NULL,
  hora_salida DATETIME(3) NULL,
  estado ENUM('activo', 'pausado', 'finalizado') NOT NULL,
  tiempo_neto INT NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_jornadas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE,
  INDEX idx_jornadas_usuario_id (usuario_id),
  INDEX idx_jornadas_fecha (fecha),
  INDEX idx_jornadas_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pausas (
  id VARCHAR(100) PRIMARY KEY,
  jornada_id VARCHAR(100) NOT NULL,
  motivo TEXT NOT NULL,
  hora_inicio DATETIME(3) NOT NULL,
  hora_fin DATETIME(3) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pausas_jornada
    FOREIGN KEY (jornada_id) REFERENCES jornadas(id)
    ON DELETE CASCADE,
  INDEX idx_pausas_jornada_id (jornada_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auditoria_logs (
  id VARCHAR(100) PRIMARY KEY,
  admin_id VARCHAR(100) NULL,
  admin_nombre TEXT NOT NULL,
  usuario_nombre TEXT NOT NULL,
  jornada_id VARCHAR(100) NOT NULL,
  campo_modificado TEXT NOT NULL,
  valor_anterior TEXT NOT NULL,
  valor_nuevo TEXT NOT NULL,
  motivo_edicion TEXT NOT NULL,
  fecha_cambio DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_auditoria_admin
    FOREIGN KEY (admin_id) REFERENCES usuarios(id)
    ON DELETE SET NULL,
  INDEX idx_auditoria_fecha_cambio (fecha_cambio),
  INDEX idx_auditoria_jornada_id (jornada_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS anuncios (
  id VARCHAR(50) PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  color ENUM('blue', 'yellow', 'green', 'red', 'slate') NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO usuarios (
  id, nombre, email, password_hash, rol, avatar, cargo, activo
) VALUES (
  'u-admin',
  'Administrador Principal',
  'admin@sammersjeans.com',
  'pbkdf2_sha256$310000$4b99d0dbedf9f5a733acfbc282f3ea61$c1fd97898388b996f75226734f0bb4b66c0f22db201911f4cdea25bbc2207485',
  'Administrador',
  'AP',
  'Administrador General',
  TRUE
) ON DUPLICATE KEY UPDATE email = email;

INSERT INTO motivos_pausa (id, nombre, activo) VALUES
  ('m-1', 'Almuerzo', TRUE),
  ('m-2', 'Pausa Activa / Break', TRUE),
  ('m-3', 'Asunto Medico', TRUE),
  ('m-4', 'Diligencia Personal', TRUE),
  ('m-5', 'Capacitacion', TRUE)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO anuncios (id, titulo, descripcion, color) VALUES
  ('a-1', 'Nuevo diseno disponible', 'Interfaz mejorada en el sistema de registro.', 'blue'),
  ('a-2', 'Proceso operativo actualizado', 'Cambios en el flujo de trabajo en confeccion.', 'yellow'),
  ('a-3', 'Entrega de equipos de seguridad', 'Equipo disponible para recoleccion en almacen general.', 'green')
ON DUPLICATE KEY UPDATE titulo = VALUES(titulo);

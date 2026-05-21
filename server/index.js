import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { hashPassword, signToken, verifyPassword, verifyToken } from './auth.js';
import { pool, query, withTransaction } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env.local') });
dotenv.config({ path: path.join(projectRoot, '.env') });

const app = express();
const port = Number(process.env.API_PORT || 3000);
const host = process.env.API_HOST || '127.0.0.1';

app.use(express.json({ limit: '2mb' }));

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (err) {
    next(err);
  }
};

const badRequest = (message) => {
  const err = new Error(message);
  err.status = 400;
  return err;
};

const forbidden = (message = 'No tienes permisos para realizar esta accion.') => {
  const err = new Error(message);
  err.status = 403;
  return err;
};

const normalizeBoolean = (value) => Boolean(Number(value));

const parseJson = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const publicUser = (row) => {
  if (!row) return null;
  const user = { ...row };
  delete user.password_hash;
  return {
    ...user,
    activo: normalizeBoolean(user.activo),
    face_descriptor: parseJson(user.face_descriptor)
  };
};

const normalizeMotivo = (row) => ({
  ...row,
  activo: normalizeBoolean(row.activo)
});

const normalizeJornada = (row, pausas = []) => ({
  ...row,
  pausas
});

const normalizePausa = (row) => row;

const loadUserById = async (id) => {
  const rows = await query('SELECT * FROM usuarios WHERE id = ?', [id]);
  return rows[0] || null;
};

const loadJornadaById = async (id) => {
  const rows = await query('SELECT * FROM jornadas WHERE id = ?', [id]);
  return rows[0] || null;
};

const ensureJornadaAccess = (req, jornada) => {
  if (!jornada) throw badRequest('La jornada no existe.');
  if (req.user.rol !== 'Administrador' && jornada.usuario_id !== req.user.id) {
    throw forbidden();
  }
};

const requireAuth = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const payload = verifyToken(token);

  if (!payload?.sub) {
    throw forbidden('Sesion vencida o invalida. Inicia sesion nuevamente.');
  }

  const user = await loadUserById(payload.sub);
  if (!user || !normalizeBoolean(user.activo)) {
    throw forbidden('Usuario inactivo o inexistente.');
  }

  req.user = publicUser(user);
  next();
});

const optionalAuth = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const payload = verifyToken(token);

  if (payload?.sub) {
    const user = await loadUserById(payload.sub);
    req.user = user && normalizeBoolean(user.activo) ? publicUser(user) : null;
  } else {
    req.user = null;
  }

  next();
});

const requireAdmin = (req, _res, next) => {
  if (req.user?.rol !== 'Administrador') {
    next(forbidden('Solo un administrador puede realizar esta accion.'));
    return;
  }
  next();
};

const avatarFromName = (nombre) => (
  String(nombre || 'US')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 2) || 'US'
);

const toDateOrNull = (value) => (value ? new Date(value) : null);

const fetchPausasPorJornadas = async (jornadas) => {
  const ids = jornadas.map((jornada) => jornada.id);
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  const rows = await query(
    `SELECT * FROM pausas WHERE jornada_id IN (${placeholders}) ORDER BY hora_inicio ASC`,
    ids
  );
  return rows.map(normalizePausa);
};

const fetchJornadas = async ({ usuarioId, onlyActive = false, requester }) => {
  const conditions = [];
  const params = [];

  if (requester.rol !== 'Administrador') {
    conditions.push('usuario_id = ?');
    params.push(requester.id);
  } else if (usuarioId) {
    conditions.push('usuario_id = ?');
    params.push(usuarioId);
  }

  if (onlyActive) {
    conditions.push("estado <> 'finalizado'");
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const jornadas = await query(
    `SELECT * FROM jornadas ${where} ORDER BY fecha DESC, hora_entrada DESC`,
    params
  );
  const pausas = await fetchPausasPorJornadas(jornadas);

  return jornadas.map((jornada) => normalizeJornada(
    jornada,
    pausas.filter((pausa) => pausa.jornada_id === jornada.id)
  ));
};

app.get('/api/health', asyncHandler(async (_req, res) => {
  await query('SELECT 1 AS ok');
  res.json({ ok: true, database: process.env.MYSQL_DATABASE || 'HORARIOS' });
}));

app.get('/api/auth/session', optionalAuth, (req, res) => {
  res.json({ user: req.user || null });
});

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    throw badRequest('Correo y contrasena son obligatorios.');
  }

  const rows = await query('SELECT * FROM usuarios WHERE LOWER(email) = ?', [email]);
  const user = rows[0];

  if (!user || !verifyPassword(password, user.password_hash)) {
    throw forbidden('Credenciales incorrectas.');
  }

  if (!normalizeBoolean(user.activo)) {
    throw forbidden('Esta cuenta esta desactivada.');
  }

  const safeUser = publicUser(user);
  res.json({ user: safeUser, token: signToken(safeUser) });
}));

app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const rol = ['Empleado', 'Administrador'].includes(req.body.rol) ? req.body.rol : 'Empleado';

  if (!nombre || !email || password.length < 6) {
    throw badRequest('Nombre, correo y contrasena de minimo 6 caracteres son obligatorios.');
  }

  const user = {
    id: `u-${Date.now()}`,
    nombre,
    email,
    password_hash: hashPassword(password),
    rol,
    avatar: avatarFromName(nombre),
    cargo: String(req.body.cargo || '').trim() || null,
    telefono_codigo_pais: req.body.telefono_codigo_pais || null,
    telefono_numero: req.body.telefono_numero || null,
    telefono_whatsapp: req.body.telefono_whatsapp || null
  };

  await query(
    `INSERT INTO usuarios
      (id, nombre, email, password_hash, rol, avatar, cargo, telefono_codigo_pais, telefono_numero, telefono_whatsapp, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      user.id,
      user.nombre,
      user.email,
      user.password_hash,
      user.rol,
      user.avatar,
      user.cargo,
      user.telefono_codigo_pais,
      user.telefono_numero,
      user.telefono_whatsapp
    ]
  );

  res.status(201).json({ user: publicUser(user) });
}));

app.post('/api/auth/logout', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/usuarios', requireAuth, asyncHandler(async (_req, res) => {
  const rows = await query('SELECT * FROM usuarios ORDER BY creado_en ASC');
  res.json({ data: rows.map(publicUser) });
}));

app.post('/api/usuarios', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const rol = ['Empleado', 'Administrador'].includes(req.body.rol) ? req.body.rol : 'Empleado';

  if (!nombre || !email) {
    throw badRequest('Nombre y correo son obligatorios.');
  }

  const user = {
    id: req.body.id || `u-${Date.now()}`,
    nombre,
    email,
    password_hash: req.body.password ? hashPassword(req.body.password) : null,
    rol,
    avatar: req.body.avatar || avatarFromName(nombre),
    cargo: req.body.cargo || null,
    activo: req.body.activo !== false,
    telefono_codigo_pais: req.body.telefono_codigo_pais || null,
    telefono_numero: req.body.telefono_numero || null,
    telefono_whatsapp: req.body.telefono_whatsapp || null,
    face_descriptor: req.body.face_descriptor ? JSON.stringify(req.body.face_descriptor) : null
  };

  await query(
    `INSERT INTO usuarios
      (id, nombre, email, password_hash, rol, avatar, cargo, activo, telefono_codigo_pais, telefono_numero, telefono_whatsapp, face_descriptor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.nombre,
      user.email,
      user.password_hash,
      user.rol,
      user.avatar,
      user.cargo,
      user.activo,
      user.telefono_codigo_pais,
      user.telefono_numero,
      user.telefono_whatsapp,
      user.face_descriptor
    ]
  );

  res.status(201).json({ data: publicUser(user) });
}));

app.put('/api/usuarios/:id', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.rol !== 'Administrador' && req.user.id !== req.params.id) {
    throw forbidden();
  }

  const existing = await loadUserById(req.params.id);
  if (!existing) throw badRequest('El usuario no existe.');

  const nextUser = {
    ...existing,
    ...req.body,
    email: String(req.body.email || existing.email).trim().toLowerCase(),
    activo: req.body.activo === undefined ? existing.activo : req.body.activo
  };

  const faceDescriptor = Object.prototype.hasOwnProperty.call(req.body, 'face_descriptor')
    ? JSON.stringify(req.body.face_descriptor || null)
    : existing.face_descriptor;

  await query(
    `UPDATE usuarios SET
      nombre = ?, email = ?, rol = ?, avatar = ?, cargo = ?, activo = ?,
      telefono_codigo_pais = ?, telefono_numero = ?, telefono_whatsapp = ?,
      face_descriptor = ?
     WHERE id = ?`,
    [
      nextUser.nombre,
      nextUser.email,
      nextUser.rol,
      nextUser.avatar || avatarFromName(nextUser.nombre),
      nextUser.cargo || null,
      Boolean(nextUser.activo),
      nextUser.telefono_codigo_pais || null,
      nextUser.telefono_numero || null,
      nextUser.telefono_whatsapp || null,
      faceDescriptor,
      req.params.id
    ]
  );

  const saved = await loadUserById(req.params.id);
  res.json({ data: publicUser(saved) });
}));

app.get('/api/usuarios/:id/face', requireAuth, asyncHandler(async (req, res) => {
  const user = await loadUserById(req.params.id);
  if (!user) throw badRequest('El usuario no existe.');
  res.json({ face_descriptor: parseJson(user.face_descriptor) });
}));

app.put('/api/usuarios/:id/face', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.rol !== 'Administrador' && req.user.id !== req.params.id) {
    throw forbidden();
  }

  await query(
    'UPDATE usuarios SET face_descriptor = ? WHERE id = ?',
    [JSON.stringify(req.body.face_descriptor || null), req.params.id]
  );
  const saved = await loadUserById(req.params.id);
  res.json({ data: publicUser(saved) });
}));

app.get('/api/motivos-pausa', requireAuth, asyncHandler(async (_req, res) => {
  const rows = await query('SELECT * FROM motivos_pausa ORDER BY creado_en ASC');
  res.json({ data: rows.map(normalizeMotivo) });
}));

app.post('/api/motivos-pausa', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const motivo = {
    id: req.body.id || `m-${Date.now()}`,
    nombre: String(req.body.nombre || '').trim(),
    activo: req.body.activo !== false
  };

  if (!motivo.nombre) throw badRequest('El nombre del motivo es obligatorio.');

  await query(
    'INSERT INTO motivos_pausa (id, nombre, activo) VALUES (?, ?, ?)',
    [motivo.id, motivo.nombre, motivo.activo]
  );
  res.status(201).json({ data: normalizeMotivo(motivo) });
}));

app.put('/api/motivos-pausa/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await query(
    'UPDATE motivos_pausa SET nombre = ?, activo = ? WHERE id = ?',
    [String(req.body.nombre || '').trim(), Boolean(req.body.activo), req.params.id]
  );
  const rows = await query('SELECT * FROM motivos_pausa WHERE id = ?', [req.params.id]);
  res.json({ data: normalizeMotivo(rows[0]) });
}));

app.delete('/api/motivos-pausa/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await query('DELETE FROM motivos_pausa WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

app.get('/api/jornadas/activa', requireAuth, asyncHandler(async (req, res) => {
  const usuarioId = req.query.usuario_id || req.user.id;
  const jornadas = await fetchJornadas({ usuarioId, onlyActive: true, requester: req.user });
  res.json({ data: jornadas[0] || null });
}));

app.get('/api/jornadas', requireAuth, asyncHandler(async (req, res) => {
  const jornadas = await fetchJornadas({
    usuarioId: req.query.usuario_id,
    requester: req.user
  });
  res.json({ data: jornadas });
}));

app.post('/api/jornadas', requireAuth, asyncHandler(async (req, res) => {
  const usuarioId = req.body.usuario_id;
  if (req.user.rol !== 'Administrador' && usuarioId !== req.user.id) {
    throw forbidden();
  }

  await query(
    `INSERT INTO jornadas
      (id, usuario_id, fecha, hora_entrada, hora_salida, estado, tiempo_neto)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      req.body.id,
      usuarioId,
      req.body.fecha,
      toDateOrNull(req.body.hora_entrada),
      toDateOrNull(req.body.hora_salida),
      req.body.estado || 'activo',
      Number(req.body.tiempo_neto || 0)
    ]
  );

  const jornada = await loadJornadaById(req.body.id);
  res.status(201).json({ data: normalizeJornada(jornada, []) });
}));

app.post('/api/jornadas/:id/pausas', requireAuth, asyncHandler(async (req, res) => {
  const jornada = await loadJornadaById(req.params.id);
  ensureJornadaAccess(req, jornada);

  await withTransaction(async (connection) => {
    await connection.execute(
      `INSERT INTO pausas (id, jornada_id, motivo, hora_inicio, hora_fin)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.body.id,
        req.params.id,
        req.body.motivo,
        toDateOrNull(req.body.hora_inicio),
        toDateOrNull(req.body.hora_fin)
      ]
    );
    await connection.execute('UPDATE jornadas SET estado = ? WHERE id = ?', ['pausado', req.params.id]);
  });

  const rows = await query('SELECT * FROM pausas WHERE id = ?', [req.body.id]);
  res.status(201).json({ data: normalizePausa(rows[0]) });
}));

app.put('/api/jornadas/:id/pausas/:pauseId/reanudar', requireAuth, asyncHandler(async (req, res) => {
  const jornada = await loadJornadaById(req.params.id);
  ensureJornadaAccess(req, jornada);

  await withTransaction(async (connection) => {
    await connection.execute(
      'UPDATE pausas SET hora_fin = ? WHERE id = ? AND jornada_id = ?',
      [toDateOrNull(req.body.hora_fin), req.params.pauseId, req.params.id]
    );
    await connection.execute('UPDATE jornadas SET estado = ? WHERE id = ?', ['activo', req.params.id]);
  });

  const rows = await query('SELECT * FROM pausas WHERE id = ?', [req.params.pauseId]);
  res.json({ data: normalizePausa(rows[0]) });
}));

app.put('/api/jornadas/:id/salida', requireAuth, asyncHandler(async (req, res) => {
  const jornada = await loadJornadaById(req.params.id);
  ensureJornadaAccess(req, jornada);

  await query(
    'UPDATE jornadas SET hora_salida = ?, estado = ?, tiempo_neto = ? WHERE id = ?',
    [toDateOrNull(req.body.hora_salida), 'finalizado', Number(req.body.tiempo_neto || 0), req.params.id]
  );

  const saved = await loadJornadaById(req.params.id);
  const pausas = await fetchPausasPorJornadas([saved]);
  res.json({ data: normalizeJornada(saved, pausas) });
}));

app.put('/api/jornadas/:id/admin', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const jornada = req.body.jornada || {};
  const pausas = req.body.pausas || [];

  await withTransaction(async (connection) => {
    await connection.execute(
      `UPDATE jornadas SET hora_entrada = ?, hora_salida = ?, tiempo_neto = ?
       WHERE id = ?`,
      [
        toDateOrNull(jornada.hora_entrada),
        toDateOrNull(jornada.hora_salida),
        Number(jornada.tiempo_neto || 0),
        req.params.id
      ]
    );

    await connection.execute('DELETE FROM pausas WHERE jornada_id = ?', [req.params.id]);

    for (const pausa of pausas) {
      await connection.execute(
        `INSERT INTO pausas (id, jornada_id, motivo, hora_inicio, hora_fin)
         VALUES (?, ?, ?, ?, ?)`,
        [
          pausa.id,
          req.params.id,
          pausa.motivo,
          toDateOrNull(pausa.hora_inicio),
          toDateOrNull(pausa.hora_fin)
        ]
      );
    }
  });

  res.json({ ok: true });
}));

app.get('/api/auditoria-logs', requireAuth, asyncHandler(async (_req, res) => {
  const rows = await query('SELECT * FROM auditoria_logs ORDER BY fecha_cambio DESC');
  res.json({ data: rows });
}));

app.post('/api/auditoria-logs', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await query(
    `INSERT INTO auditoria_logs
      (id, admin_id, admin_nombre, usuario_nombre, jornada_id, campo_modificado,
       valor_anterior, valor_nuevo, motivo_edicion, fecha_cambio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.body.id,
      req.body.admin_id,
      req.body.admin_nombre,
      req.body.usuario_nombre,
      req.body.jornada_id,
      req.body.campo_modificado,
      req.body.valor_anterior,
      req.body.valor_nuevo,
      req.body.motivo_edicion,
      toDateOrNull(req.body.fecha_cambio) || new Date()
    ]
  );

  const rows = await query('SELECT * FROM auditoria_logs WHERE id = ?', [req.body.id]);
  res.status(201).json({ data: rows[0] });
}));

app.get('/api/anuncios', requireAuth, asyncHandler(async (_req, res) => {
  const rows = await query('SELECT * FROM anuncios ORDER BY creado_en DESC');
  res.json({ data: rows });
}));

if (process.env.SERVE_STATIC === 'true') {
  const distPath = path.join(projectRoot, 'dist');
  app.use(express.static(distPath));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  void _next;

  if (err?.code === 'ER_DUP_ENTRY') {
    res.status(409).json({ error: { message: 'Ya existe un registro con un valor unico repetido.' } });
    return;
  }

  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: status === 500 ? 'Error interno del servidor local.' : err.message
    }
  });

  if (status === 500) {
    console.error(err);
  }
});

app.listen(port, host, () => {
  console.log(`API local HORARIOS escuchando en http://${host}:${port}`);
});

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

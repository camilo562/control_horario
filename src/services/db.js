import { getSupabaseConfigMessage, supabase } from './supabase';

const requireSupabase = () => {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  return supabase;
};

const throwIfError = (error) => {
  if (error) {
    throw error;
  }
};

const normalizeSingle = (data) => {
  if (Array.isArray(data)) {
    return data[0] || null;
  }

  return data || null;
};

const fetchPausasPorJornadas = async (client, jornadas) => {
  const jornadaIds = jornadas.map((jornada) => jornada.id);
  if (jornadaIds.length === 0) return [];

  const { data, error } = await client
    .from('pausas')
    .select('*')
    .in('jornada_id', jornadaIds);

  throwIfError(error);
  return data || [];
};

export const dbService = {
  async getUsuarios() {
    const client = requireSupabase();
    const { data, error } = await client
      .from('usuarios')
      .select('*')
      .order('creado_en', { ascending: true });

    throwIfError(error);
    return data || [];
  },

  async insertUsuario(usuario) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('usuarios')
      .insert([usuario])
      .select()
      .single();

    throwIfError(error);
    return normalizeSingle(data);
  },

  async updateUsuario(usuario) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('usuarios')
      .update({
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        cargo: usuario.cargo,
        activo: usuario.activo,
        ...(usuario.telefono_codigo_pais !== undefined && { telefono_codigo_pais: usuario.telefono_codigo_pais || null }),
        ...(usuario.telefono_numero !== undefined && { telefono_numero: usuario.telefono_numero || null }),
        ...(usuario.telefono_whatsapp !== undefined && { telefono_whatsapp: usuario.telefono_whatsapp || null }),
        ...(usuario.face_descriptor !== undefined && { face_descriptor: usuario.face_descriptor })
      })
      .eq('id', usuario.id)
      .select()
      .single();

    throwIfError(error);
    return normalizeSingle(data);
  },

  async updateFaceDescriptor(userId, descriptor) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('usuarios')
      .update({ face_descriptor: descriptor })
      .eq('id', userId)
      .select()
      .single();

    throwIfError(error);
    return normalizeSingle(data);
  },

  async getFaceDescriptor(userId) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('usuarios')
      .select('face_descriptor')
      .eq('id', userId)
      .maybeSingle();

    throwIfError(error);
    return data?.face_descriptor || null;
  },

  async getMotivosPausa() {
    const client = requireSupabase();
    const { data, error } = await client
      .from('motivos_pausa')
      .select('*')
      .order('creado_en', { ascending: true });

    throwIfError(error);
    return data || [];
  },

  async insertMotivoPausa(motivo) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('motivos_pausa')
      .insert([motivo])
      .select()
      .single();

    throwIfError(error);
    return normalizeSingle(data);
  },

  async updateMotivoPausa(id, nombre, activo) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('motivos_pausa')
      .update({ nombre, activo })
      .eq('id', id)
      .select()
      .single();

    throwIfError(error);
    return normalizeSingle(data);
  },

  async deleteMotivoPausa(id) {
    const client = requireSupabase();
    const { error } = await client
      .from('motivos_pausa')
      .delete()
      .eq('id', id);

    throwIfError(error);
    return true;
  },

  async getJornadaActiva(usuarioId) {
    const client = requireSupabase();
    const { data: shifts, error: shiftError } = await client
      .from('jornadas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .neq('estado', 'finalizado')
      .order('hora_entrada', { ascending: false })
      .limit(1);

    throwIfError(shiftError);

    if (!shifts || shifts.length === 0) {
      return null;
    }

    const shift = shifts[0];
    const { data: pauses, error: pauseError } = await client
      .from('pausas')
      .select('*')
      .eq('jornada_id', shift.id)
      .order('hora_inicio', { ascending: true });

    throwIfError(pauseError);
    return { ...shift, pausas: pauses || [] };
  },

  async getHistorialEmpleado(usuarioId) {
    const client = requireSupabase();
    const { data: shifts, error: shiftError } = await client
      .from('jornadas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('fecha', { ascending: false });

    throwIfError(shiftError);

    const jornadas = shifts || [];
    const pauses = await fetchPausasPorJornadas(client, jornadas);

    return jornadas.map((shift) => ({
      ...shift,
      pausas: pauses.filter((pause) => pause.jornada_id === shift.id)
    }));
  },

  async getHistorialGlobal() {
    const client = requireSupabase();
    const { data: shifts, error: shiftError } = await client
      .from('jornadas')
      .select('*')
      .order('fecha', { ascending: false });

    throwIfError(shiftError);

    const jornadas = shifts || [];
    const pauses = await fetchPausasPorJornadas(client, jornadas);

    return jornadas.map((shift) => ({
      ...shift,
      pausas: pauses.filter((pause) => pause.jornada_id === shift.id)
    }));
  },

  async registrarEntrada(jornada) {
    const client = requireSupabase();
    const dbJornada = {
      id: jornada.id,
      usuario_id: jornada.usuario_id,
      fecha: jornada.fecha,
      hora_entrada: jornada.hora_entrada,
      estado: 'activo',
      tiempo_neto: 0
    };

    const { data, error } = await client
      .from('jornadas')
      .insert([dbJornada])
      .select()
      .single();

    throwIfError(error);
    return { ...normalizeSingle(data), pausas: [] };
  },

  async registrarPausa(jornadaId, pauseData) {
    const client = requireSupabase();
    const { data: pause, error: pauseError } = await client
      .from('pausas')
      .insert([pauseData])
      .select()
      .single();

    throwIfError(pauseError);

    const { error: shiftError } = await client
      .from('jornadas')
      .update({ estado: 'pausado' })
      .eq('id', jornadaId);

    throwIfError(shiftError);
    return normalizeSingle(pause);
  },

  async registrarReanudacion(jornadaId, pauseId, horaFin) {
    const client = requireSupabase();
    const { data: pause, error: pauseError } = await client
      .from('pausas')
      .update({ hora_fin: horaFin })
      .eq('id', pauseId)
      .select()
      .single();

    throwIfError(pauseError);

    const { error: shiftError } = await client
      .from('jornadas')
      .update({ estado: 'activo' })
      .eq('id', jornadaId);

    throwIfError(shiftError);
    return normalizeSingle(pause);
  },

  async registrarSalida(jornadaId, horaSalida, tiempoNeto) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('jornadas')
      .update({
        hora_salida: horaSalida,
        estado: 'finalizado',
        tiempo_neto: tiempoNeto
      })
      .eq('id', jornadaId)
      .select()
      .single();

    throwIfError(error);
    return normalizeSingle(data);
  },

  async adminGuardarJornada(jornada, manualPauses) {
    const client = requireSupabase();
    const { error: shiftError } = await client
      .from('jornadas')
      .update({
        hora_entrada: jornada.hora_entrada,
        hora_salida: jornada.hora_salida,
        tiempo_neto: jornada.tiempo_neto
      })
      .eq('id', jornada.id);

    throwIfError(shiftError);

    const { error: deleteError } = await client
      .from('pausas')
      .delete()
      .eq('jornada_id', jornada.id);

    throwIfError(deleteError);

    if (manualPauses && manualPauses.length > 0) {
      const { error: insertError } = await client
        .from('pausas')
        .insert(manualPauses.map((pause) => ({
          id: pause.id,
          jornada_id: pause.jornada_id,
          motivo: pause.motivo,
          hora_inicio: pause.hora_inicio,
          hora_fin: pause.hora_fin
        })));

      throwIfError(insertError);
    }

    return true;
  },

  async getAuditLogs() {
    const client = requireSupabase();
    const { data, error } = await client
      .from('auditoria_logs')
      .select('*')
      .order('fecha_cambio', { ascending: false });

    throwIfError(error);
    return data || [];
  },

  async insertAuditLog(log) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('auditoria_logs')
      .insert([log])
      .select()
      .single();

    throwIfError(error);
    return normalizeSingle(data);
  },

  async getAnuncios() {
    const client = requireSupabase();
    const { data, error } = await client
      .from('anuncios')
      .select('*')
      .order('creado_en', { ascending: false });

    throwIfError(error);
    return data || [];
  }
};

import { supabase } from './supabase';
import { 
  DEFAULT_USERS, 
  DEFAULT_MOTIVOS_PAUSA, 
  DEFAULT_ANUNCIOS, 
  getMockShifts, 
  DEFAULT_AUDITORIA_LOGS 
} from '../constants/initialData';

// Helper to determine if we should use Supabase or fallback to localStorage
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && key && !url.includes('ybwawtzaaznrsrxofoow') && !url.includes('tu_proyecto_url');
};

// --- LOCAL STORAGE DATA HELPERS (Fallback Driver) ---
const getLocalData = (key, initial) => {
  const saved = localStorage.getItem(key);
  if (saved) return JSON.parse(saved);
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
};

const setLocalData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// =====================================================================
// 🗄️ DATABASE SERVICES LAYER (SUPABASE + FALLBACKS)
// =====================================================================

export const dbService = {
  // 1. --- USUARIOS SERVICES ---
  async getUsuarios() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .order('creado_en', { ascending: true });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase getUsuarios failed, falling back:', err);
      }
    }
    return getLocalData('sh_users', DEFAULT_USERS);
  },

  async insertUsuario(usuario) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .insert([usuario])
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase insertUsuario failed:', err);
      }
    }
    const current = getLocalData('sh_users', DEFAULT_USERS);
    current.push(usuario);
    setLocalData('sh_users', current);
    return usuario;
  },

  async updateUsuario(usuario) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
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
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase updateUsuario failed:', err);
      }
    }
    const current = getLocalData('sh_users', DEFAULT_USERS);
    const index = current.findIndex(u => u.id === usuario.id);
    if (index !== -1) {
      current[index] = { ...current[index], ...usuario };
      setLocalData('sh_users', current);
    }
    return usuario;
  },

  async updateFaceDescriptor(userId, descriptor) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .update({ face_descriptor: descriptor })
          .eq('id', userId)
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase updateFaceDescriptor failed:', err);
      }
    }
    
    const current = getLocalData('sh_users', DEFAULT_USERS);
    const index = current.findIndex(u => u.id === userId);
    if (index !== -1) {
      current[index] = { ...current[index], face_descriptor: descriptor };
      setLocalData('sh_users', current);
      return current[index];
    }
    return null;
  },

  async getFaceDescriptor(userId) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('face_descriptor')
          .eq('id', userId)
          .single();
        if (error) throw error;
        return data?.face_descriptor || null;
      } catch (err) {
        console.error('Supabase getFaceDescriptor failed:', err);
      }
    }
    
    const current = getLocalData('sh_users', DEFAULT_USERS);
    const user = current.find(u => u.id === userId);
    return user ? user.face_descriptor : null;
  },

  // 2. --- MOTIVOS DE PAUSA SERVICES ---
  async getMotivosPausa() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('motivos_pausa')
          .select('*')
          .order('creado_en', { ascending: true });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase getMotivosPausa failed, falling back:', err);
      }
    }
    return getLocalData('sh_motivos', DEFAULT_MOTIVOS_PAUSA);
  },

  async insertMotivoPausa(motivo) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('motivos_pausa')
          .insert([motivo])
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase insertMotivoPausa failed:', err);
      }
    }
    const current = getLocalData('sh_motivos', DEFAULT_MOTIVOS_PAUSA);
    current.push(motivo);
    setLocalData('sh_motivos', current);
    return motivo;
  },

  async updateMotivoPausa(id, nombre, activo) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('motivos_pausa')
          .update({ nombre, activo })
          .eq('id', id)
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase updateMotivoPausa failed:', err);
      }
    }
    const current = getLocalData('sh_motivos', DEFAULT_MOTIVOS_PAUSA);
    const index = current.findIndex(m => m.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], nombre, activo };
      setLocalData('sh_motivos', current);
    }
    return { id, nombre, activo };
  },

  async deleteMotivoPausa(id) {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('motivos_pausa')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase deleteMotivoPausa failed:', err);
      }
    }
    const current = getLocalData('sh_motivos', DEFAULT_MOTIVOS_PAUSA);
    const filtered = current.filter(m => m.id !== id);
    setLocalData('sh_motivos', filtered);
    return true;
  },

  // 3. --- JORNADAS Y PAUSAS SERVICES ---
  async getJornadaActiva(usuarioId) {
    if (isSupabaseConfigured()) {
      try {
        // Fetch active/paused shift
        const { data: shiftData, error: shiftError } = await supabase
          .from('jornadas')
          .select('*')
          .eq('usuario_id', usuarioId)
          .neq('estado', 'finalizado')
          .order('hora_entrada', { ascending: false })
          .limit(1);

        if (shiftError) throw shiftError;
        
        if (shiftData && shiftData.length > 0) {
          const shift = shiftData[0];
          // Fetch pauses associated with this shift
          const { data: pauseData, error: pauseError } = await supabase
            .from('pausas')
            .select('*')
            .eq('jornada_id', shift.id)
            .order('hora_inicio', { ascending: true });

          if (pauseError) throw pauseError;
          return { ...shift, pausas: pauseData || [] };
        }
        return null;
      } catch (err) {
        console.error('Supabase getJornadaActiva failed:', err);
      }
    }
    
    // Fallback: search in local storage active shifts map
    const activeMap = getLocalData('sh_active_shifts_map', {});
    return activeMap[usuarioId] || null;
  },

  async getHistorialEmpleado(usuarioId) {
    if (isSupabaseConfigured()) {
      try {
        const { data: shifts, error: shiftError } = await supabase
          .from('jornadas')
          .select('*')
          .eq('usuario_id', usuarioId)
          .order('fecha', { ascending: false });

        if (shiftError) throw shiftError;

        // Fetch all pauses for these shifts
        const { data: pauses, error: pauseError } = await supabase
          .from('pausas')
          .select('*')
          .in('jornada_id', shifts.map(s => s.id) || []);

        if (pauseError) throw pauseError;

        // Bind pauses to shifts
        return shifts.map(s => ({
          ...s,
          pausas: (pauses || []).filter(p => p.jornada_id === s.id)
        }));
      } catch (err) {
        console.error('Supabase getHistorialEmpleado failed:', err);
      }
    }
    
    const allShifts = getLocalData('sh_shifts', getMockShifts());
    return allShifts.filter(s => s.usuario_id === usuarioId);
  },

  async getHistorialGlobal() {
    if (isSupabaseConfigured()) {
      try {
        const { data: shifts, error: shiftError } = await supabase
          .from('jornadas')
          .select('*')
          .order('fecha', { ascending: false });

        if (shiftError) throw shiftError;

        const { data: pauses, error: pauseError } = await supabase
          .from('pausas')
          .select('*');

        if (pauseError) throw pauseError;

        return shifts.map(s => ({
          ...s,
          pausas: (pauses || []).filter(p => p.jornada_id === s.id)
        }));
      } catch (err) {
        console.error('Supabase getHistorialGlobal failed:', err);
      }
    }
    return getLocalData('sh_shifts', getMockShifts());
  },

  async registrarEntrada(jornada) {
    if (isSupabaseConfigured()) {
      try {
        const dbJornada = {
          id: jornada.id,
          usuario_id: jornada.usuario_id,
          fecha: jornada.fecha,
          hora_entrada: jornada.hora_entrada,
          estado: 'activo',
          tiempo_neto: 0
        };
        const { data, error } = await supabase
          .from('jornadas')
          .insert([dbJornada])
          .select();
        if (error) throw error;
        return { ...data[0], pausas: [] };
      } catch (err) {
        console.error('Supabase registrarEntrada failed:', err);
      }
    }
    
    // Save to active map and global shift list
    const activeMap = getLocalData('sh_active_shifts_map', {});
    activeMap[jornada.usuario_id] = { ...jornada, estado: 'activo', pausas: [] };
    setLocalData('sh_active_shifts_map', activeMap);
    return activeMap[jornada.usuario_id];
  },

  async registrarPausa(jornadaId, pauseData, usuarioId) {
    if (isSupabaseConfigured()) {
      try {
        // Insert pause interval
        const { data: pData, error: pError } = await supabase
          .from('pausas')
          .insert([pauseData])
          .select();
        if (pError) throw pError;

        // Update shift state to paused
        const { data: sData, error: sError } = await supabase
          .from('jornadas')
          .update({ estado: 'pausado' })
          .eq('id', jornadaId)
          .select();
        if (sError) throw sError;

        return pData[0];
      } catch (err) {
        console.error('Supabase registrarPausa failed:', err);
      }
    }
    
    const activeMap = getLocalData('sh_active_shifts_map', {});
    if (activeMap[usuarioId]) {
      activeMap[usuarioId].estado = 'pausado';
      activeMap[usuarioId].pausas.push(pauseData);
      setLocalData('sh_active_shifts_map', activeMap);
    }
    return pauseData;
  },

  async registrarReanudacion(jornadaId, pauseId, horaFin, usuarioId) {
    if (isSupabaseConfigured()) {
      try {
        // Update pause end
        const { data: pData, error: pError } = await supabase
          .from('pausas')
          .update({ hora_fin: horaFin })
          .eq('id', pauseId)
          .select();
        if (pError) throw pError;

        // Update shift state to active
        const { error: sError } = await supabase
          .from('jornadas')
          .update({ estado: 'activo' })
          .eq('id', jornadaId);
        if (sError) throw sError;

        return pData[0];
      } catch (err) {
        console.error('Supabase registrarReanudacion failed:', err);
      }
    }
    
    const activeMap = getLocalData('sh_active_shifts_map', {});
    if (activeMap[usuarioId]) {
      activeMap[usuarioId].estado = 'activo';
      const pIdx = activeMap[usuarioId].pausas.findIndex(p => p.id === pauseId);
      if (pIdx !== -1) {
        activeMap[usuarioId].pausas[pIdx].hora_fin = horaFin;
      }
      setLocalData('sh_active_shifts_map', activeMap);
    }
    return null;
  },

  async registrarSalida(jornadaId, horaSalida, tiempoNeto, usuarioId) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('jornadas')
          .update({
            hora_salida: horaSalida,
            estado: 'finalizado',
            tiempo_neto: tiempoNeto
          })
          .eq('id', jornadaId)
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase registrarSalida failed:', err);
      }
    }
    
    const activeMap = getLocalData('sh_active_shifts_map', {});
    const finishedShift = activeMap[usuarioId];
    if (finishedShift) {
      finishedShift.hora_salida = horaSalida;
      finishedShift.estado = 'finalizado';
      finishedShift.tiempo_neto = tiempoNeto;
      
      // Save to global list and remove from active map
      const allShifts = getLocalData('sh_shifts', getMockShifts());
      allShifts.push(finishedShift);
      setLocalData('sh_shifts', allShifts);
      
      delete activeMap[usuarioId];
      setLocalData('sh_active_shifts_map', activeMap);
    }
    return finishedShift;
  },

  async adminGuardarJornada(jornada, manualPauses) {
    if (isSupabaseConfigured()) {
      try {
        // Update main shift times
        const { error: sError } = await supabase
          .from('jornadas')
          .update({
            hora_entrada: jornada.hora_entrada,
            hora_salida: jornada.hora_salida,
            tiempo_neto: jornada.tiempo_neto
          })
          .eq('id', jornada.id);
        if (sError) throw sError;

        // Delete existing pauses of this shift
        const { error: dError } = await supabase
          .from('pausas')
          .delete()
          .eq('jornada_id', jornada.id);
        if (dError) throw dError;

        // Insert new updated pauses
        if (manualPauses && manualPauses.length > 0) {
          const { error: iError } = await supabase
            .from('pausas')
            .insert(manualPauses.map(p => ({
              id: p.id,
              jornada_id: p.jornada_id,
              motivo: p.motivo,
              hora_inicio: p.hora_inicio,
              hora_fin: p.hora_fin
            })));
          if (iError) throw iError;
        }

        return true;
      } catch (err) {
        console.error('Supabase adminGuardarJornada failed:', err);
      }
    }
    
    const allShifts = getLocalData('sh_shifts', getMockShifts());
    const idx = allShifts.findIndex(s => s.id === jornada.id);
    if (idx !== -1) {
      allShifts[idx] = { 
        ...allShifts[idx], 
        hora_entrada: jornada.hora_entrada,
        hora_salida: jornada.hora_salida,
        tiempo_neto: jornada.tiempo_neto,
        pausas: manualPauses 
      };
      setLocalData('sh_shifts', allShifts);
    }
    return true;
  },

  // 4. --- LOG DE AUDITORÍA SERVICES ---
  async getAuditLogs() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('auditoria_logs')
          .select('*')
          .order('fecha_cambio', { ascending: false });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase getAuditLogs failed, falling back:', err);
      }
    }
    return getLocalData('sh_auditoria', DEFAULT_AUDITORIA_LOGS);
  },

  async insertAuditLog(log) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('auditoria_logs')
          .insert([log])
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase insertAuditLog failed:', err);
      }
    }
    const current = getLocalData('sh_auditoria', DEFAULT_AUDITORIA_LOGS);
    current.unshift(log);
    setLocalData('sh_auditoria', current);
    return log;
  },

  // 5. --- ANUNCIOS SERVICES ---
  async getAnuncios() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('anuncios')
          .select('*')
          .order('creado_en', { ascending: false });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase getAnuncios failed, falling back:', err);
      }
    }
    return getLocalData('sh_anuncios', DEFAULT_ANUNCIOS);
  }
};

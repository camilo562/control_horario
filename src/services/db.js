import { apiRequest } from './api';

const withQuery = (path, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });

  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
};

export const dbService = {
  async getUsuarios() {
    const payload = await apiRequest('/usuarios');
    return payload.data || [];
  },

  async insertUsuario(usuario) {
    const payload = await apiRequest('/usuarios', {
      method: 'POST',
      body: usuario
    });
    return payload.data;
  },

  async updateUsuario(usuario) {
    const payload = await apiRequest(`/usuarios/${encodeURIComponent(usuario.id)}`, {
      method: 'PUT',
      body: usuario
    });
    return payload.data;
  },

  async updateFaceDescriptor(userId, descriptor) {
    const payload = await apiRequest(`/usuarios/${encodeURIComponent(userId)}/face`, {
      method: 'PUT',
      body: { face_descriptor: descriptor }
    });
    return payload.data;
  },

  async getFaceDescriptor(userId) {
    const payload = await apiRequest(`/usuarios/${encodeURIComponent(userId)}/face`);
    return payload.face_descriptor || null;
  },

  async getMotivosPausa() {
    const payload = await apiRequest('/motivos-pausa');
    return payload.data || [];
  },

  async insertMotivoPausa(motivo) {
    const payload = await apiRequest('/motivos-pausa', {
      method: 'POST',
      body: motivo
    });
    return payload.data;
  },

  async updateMotivoPausa(id, nombre, activo) {
    const payload = await apiRequest(`/motivos-pausa/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: { nombre, activo }
    });
    return payload.data;
  },

  async deleteMotivoPausa(id) {
    await apiRequest(`/motivos-pausa/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return true;
  },

  async getJornadaActiva(usuarioId) {
    const payload = await apiRequest(withQuery('/jornadas/activa', { usuario_id: usuarioId }));
    return payload.data || null;
  },

  async getHistorialEmpleado(usuarioId) {
    const payload = await apiRequest(withQuery('/jornadas', { usuario_id: usuarioId }));
    return payload.data || [];
  },

  async getHistorialGlobal() {
    const payload = await apiRequest('/jornadas');
    return payload.data || [];
  },

  async registrarEntrada(jornada) {
    const payload = await apiRequest('/jornadas', {
      method: 'POST',
      body: jornada
    });
    return payload.data;
  },

  async registrarPausa(jornadaId, pauseData) {
    const payload = await apiRequest(`/jornadas/${encodeURIComponent(jornadaId)}/pausas`, {
      method: 'POST',
      body: pauseData
    });
    return payload.data;
  },

  async registrarReanudacion(jornadaId, pauseId, horaFin) {
    const payload = await apiRequest(
      `/jornadas/${encodeURIComponent(jornadaId)}/pausas/${encodeURIComponent(pauseId)}/reanudar`,
      {
        method: 'PUT',
        body: { hora_fin: horaFin }
      }
    );
    return payload.data;
  },

  async registrarSalida(jornadaId, horaSalida, tiempoNeto) {
    const payload = await apiRequest(`/jornadas/${encodeURIComponent(jornadaId)}/salida`, {
      method: 'PUT',
      body: { hora_salida: horaSalida, tiempo_neto: tiempoNeto }
    });
    return payload.data;
  },

  async adminGuardarJornada(jornada, manualPauses) {
    await apiRequest(`/jornadas/${encodeURIComponent(jornada.id)}/admin`, {
      method: 'PUT',
      body: { jornada, pausas: manualPauses || [] }
    });
    return true;
  },

  async getAuditLogs() {
    const payload = await apiRequest('/auditoria-logs');
    return payload.data || [];
  },

  async insertAuditLog(log) {
    const payload = await apiRequest('/auditoria-logs', {
      method: 'POST',
      body: log
    });
    return payload.data;
  },

  async getAnuncios() {
    const payload = await apiRequest('/anuncios');
    return payload.data || [];
  }
};

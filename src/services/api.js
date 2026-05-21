const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const TOKEN_KEY = 'control_horario_auth_token';

export const isDatabaseConfigured = () => true;

export const getDatabaseConfigMessage = () => (
  'La base de datos local no esta disponible. Verifica que el backend y MySQL esten corriendo.'
);

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

const buildUrl = (path) => `${API_BASE_URL}${path}`;

export const apiRequest = async (path, options = {}) => {
  const token = getAuthToken();
  const headers = {
    Accept: 'application/json',
    ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers || {})
  };

  let response;
  try {
    response = await fetch(buildUrl(path), {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new Error(getDatabaseConfigMessage());
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.error) {
    const message = payload.error?.message || payload.message || getDatabaseConfigMessage();
    throw new Error(message);
  }

  return payload;
};

export const authService = {
  async getSession() {
    const payload = await apiRequest('/auth/session');
    return { user: payload.user || null };
  },

  async signIn(email, password) {
    const payload = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    setAuthToken(payload.token);
    return { user: payload.user };
  },

  async signUp({ nombre, email, cargo, rol, password, telefono }) {
    const payload = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        nombre,
        email,
        cargo,
        rol,
        password,
        telefono_codigo_pais: telefono?.telefono_codigo_pais || '',
        telefono_numero: telefono?.telefono_numero || '',
        telefono_whatsapp: telefono?.telefono_whatsapp || ''
      }
    });
    return { user: payload.user };
  },

  async signOut() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  }
};

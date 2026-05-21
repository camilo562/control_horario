import { construirTelefonoUsuario, validarTelefonoWhatsapp } from './telefono';
import { enviarMensajeWhatsapp } from './envioWhatsapp';

const STORAGE_KEY = 'sammers_whatsapp_otp_v1';
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_INTENTOS = 5;

const getStore = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const setStore = (store) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const generarCodigoOtp = () => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint32Array(1);
    cryptoApi.getRandomValues(bytes);
    return String(bytes[0] % 1000000).padStart(6, '0');
  }
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
};

const mensajeOtp = ({ nombre, codigo }) => {
  const saludo = nombre ? `Hola ${nombre},` : 'Hola,';
  return [
    `${saludo} tu codigo OTP de registro para SAMMERS-JEANS es: ${codigo}`,
    'Este codigo vence en 10 minutos. Si no lo solicitaste, ignora este mensaje.'
  ].join('\n');
};

const guardarCodigo = ({ telefono_whatsapp, codigo }) => {
  const store = getStore();
  store[telefono_whatsapp] = {
    codigo,
    vence_en: Date.now() + OTP_TTL_MS,
    intentos: 0
  };
  setStore(store);
};

const borrarCodigo = (telefono_whatsapp) => {
  const store = getStore();
  delete store[telefono_whatsapp];
  setStore(store);
};

export const solicitarCodigoOtpWhatsapp = async ({ codigoPais, celular, nombre }) => {
  const validation = validarTelefonoWhatsapp({ codigoPais, celular });
  if (!validation.ok) return validation;

  const telefono = validation.telefono;
  const codigo = generarCodigoOtp();
  const message = mensajeOtp({ nombre, codigo });

  const result = await enviarMensajeWhatsapp({
    to: telefono.telefono_whatsapp,
    message
  });

  if (result.ok) {
    guardarCodigo({ telefono_whatsapp: telefono.telefono_whatsapp, codigo });
    return { ok: true, modo: result.modo, telefono };
  }

  return { ok: false, error: result.error || 'No se pudo enviar el codigo por WhatsApp.' };
};

export const verificarCodigoOtpWhatsapp = ({ codigoPais, celular, codigoOtp }) => {
  const telefono = construirTelefonoUsuario({ codigoPais, celular });
  const codigo = String(codigoOtp || '').replace(/\D+/g, '');
  const store = getStore();
  const record = store[telefono.telefono_whatsapp];

  if (!record) {
    return { ok: false, error: 'Primero solicita el codigo OTP por WhatsApp.' };
  }

  if (Date.now() > Number(record.vence_en || 0)) {
    borrarCodigo(telefono.telefono_whatsapp);
    return { ok: false, error: 'El codigo OTP vencio. Solicita uno nuevo.' };
  }

  if (Number(record.intentos || 0) >= MAX_INTENTOS) {
    borrarCodigo(telefono.telefono_whatsapp);
    return { ok: false, error: 'Se agotaron los intentos. Solicita un codigo nuevo.' };
  }

  if (record.codigo !== codigo) {
    store[telefono.telefono_whatsapp] = {
      ...record,
      intentos: Number(record.intentos || 0) + 1
    };
    setStore(store);
    return { ok: false, error: 'El codigo OTP no coincide.' };
  }

  borrarCodigo(telefono.telefono_whatsapp);
  return { ok: true, telefono };
};

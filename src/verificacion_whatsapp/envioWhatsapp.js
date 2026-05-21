const DEFAULT_SEND_ENDPOINT = '/api/servites-whatsapp/send';

const resolverEndpointEnvio = () => {
  const sendUrl = String(import.meta.env.VITE_SERVITES_WHATSAPP_SEND_URL || '').trim();
  if (sendUrl) return sendUrl;

  const apiUrl = String(import.meta.env.VITE_SERVITES_WHATSAPP_API_URL || '').trim().replace(/\/+$/, '');
  if (apiUrl) return apiUrl.endsWith('/send') ? apiUrl : `${apiUrl}/send`;

  return DEFAULT_SEND_ENDPOINT;
};

export const enviarMensajeWhatsapp = async ({ to, message }) => {
  const telefono = String(to || '').replace(/\D+/g, '');
  const texto = String(message || '').trim();
  const endpoint = resolverEndpointEnvio();
  const usarOtpLocal = String(import.meta.env.VITE_OTP_LOCAL_SIMULATION || '').toLowerCase() === 'true';

  if (!telefono) {
    return { ok: false, error: 'Falta el telefono de destino.' };
  }

  if (!texto) {
    return { ok: false, error: 'El mensaje no puede estar vacio.' };
  }

  if (usarOtpLocal) {
    console.info('OTP local simulado activo. No se enviara WhatsApp real.');
    return { ok: true, modo: 'local-simulado' };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: telefono, message: texto })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      return {
        ok: false,
        error: payload.detail || payload.message || 'No se pudo enviar el mensaje por WhatsApp.'
      };
    }

    return { ok: true, modo: 'servites', payload };
  } catch {
    return { ok: false, error: 'No se pudo conectar con el bot de WhatsApp Servites.' };
  }
};

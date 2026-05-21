import { CODIGOS_PAIS_WHATSAPP, DEFAULT_COUNTRY_CODE } from './codigosPais';

export const soloDigitos = (value) => String(value || '').replace(/\D+/g, '');

export const limpiarCodigoPais = (codigoPais = DEFAULT_COUNTRY_CODE) => {
  const digits = soloDigitos(codigoPais);
  return digits ? `+${digits}` : DEFAULT_COUNTRY_CODE;
};

export const limpiarCelular = (celular) => soloDigitos(celular).slice(0, 14);

export const getPaisPorCodigo = (codigoPais) => {
  const limpio = limpiarCodigoPais(codigoPais);
  return CODIGOS_PAIS_WHATSAPP.find((pais) => pais.codigo === limpio) || CODIGOS_PAIS_WHATSAPP[0];
};

export const construirTelefonoUsuario = ({ codigoPais, celular }) => {
  const codigoLimpio = limpiarCodigoPais(codigoPais);
  const celularLimpio = limpiarCelular(celular);
  const codigoSinSigno = soloDigitos(codigoLimpio);

  return {
    telefono_codigo_pais: codigoLimpio,
    telefono_numero: celularLimpio,
    telefono_whatsapp: `${codigoSinSigno}${celularLimpio}`
  };
};

export const validarTelefonoWhatsapp = ({ codigoPais, celular }) => {
  const telefono = construirTelefonoUsuario({ codigoPais, celular });
  const totalDigits = telefono.telefono_whatsapp.length;

  if (!telefono.telefono_codigo_pais || !telefono.telefono_numero) {
    return { ok: false, error: 'Ingresa el codigo de pais y el numero de celular.' };
  }

  if (telefono.telefono_numero.length < 7) {
    return { ok: false, error: 'El numero de celular debe tener al menos 7 digitos.' };
  }

  if (totalDigits > 15) {
    return { ok: false, error: 'El telefono completo no puede superar 15 digitos.' };
  }

  return { ok: true, telefono };
};

export const ejemploPorCodigoPais = (codigoPais) => {
  const pais = getPaisPorCodigo(codigoPais);
  return pais ? `Ej. ${pais.ejemplo}` : 'Ej. 3001234567';
};

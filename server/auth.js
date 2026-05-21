import crypto from 'node:crypto';

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 12;
const DEFAULT_HASH_ITERATIONS = 310000;

const base64Url = (value) => Buffer.from(value).toString('base64url');

const getSecret = () => (
  process.env.LOCAL_AUTH_SECRET ||
  'change-this-secret-in-production-control-horario'
);

export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(String(password), salt, DEFAULT_HASH_ITERATIONS, 32, 'sha256')
    .toString('hex');

  return `pbkdf2_sha256$${DEFAULT_HASH_ITERATIONS}$${salt}$${hash}`;
};

export const verifyPassword = (password, storedHash) => {
  if (!storedHash) return false;

  const [scheme, iterationsText, salt, expectedHash] = String(storedHash).split('$');
  if (scheme !== 'pbkdf2_sha256' || !iterationsText || !salt || !expectedHash) {
    return false;
  }

  const iterations = Number(iterationsText);
  const actual = crypto
    .pbkdf2Sync(String(password), salt, iterations, 32, 'sha256')
    .toString('hex');

  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');
  return expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

export const signToken = (user) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: user.id,
    email: user.email,
    rol: user.rol,
    exp: Math.floor(Date.now() / 1000) + DEFAULT_TOKEN_TTL_SECONDS
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const body = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(body)
    .digest('base64url');

  return `${body}.${signature}`;
};

export const verifyToken = (token) => {
  const [encodedHeader, encodedPayload, signature] = String(token || '').split('.');
  if (!encodedHeader || !encodedPayload || !signature) return null;

  const body = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', getSecret())
    .update(body)
    .digest('base64url');

  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
};

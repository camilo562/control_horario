// =====================================================================
// 🔐 SAMMERS-JEANS • FACE-API.JS SERVICE
// Servicio de reconocimiento facial para validación biométrica
// =====================================================================

import * as faceapi from 'face-api.js';

// Umbral de distancia euclidiana para considerar match (0.6 es el estándar)
const FACE_MATCH_THRESHOLD = 0.6;

// Ruta donde están los modelos estáticos
const MODEL_URL = '/models';

// Estado interno de carga
let modelsLoaded = false;

/**
 * Carga los modelos necesarios de face-api.js desde /public/models/
 * Solo se cargan una vez (singleton pattern)
 */
export const loadFaceApiModels = async () => {
  if (modelsLoaded) return true;

  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    modelsLoaded = true;
    console.log('✅ face-api.js: Modelos cargados exitosamente');
    return true;
  } catch (err) {
    console.error('❌ face-api.js: Error cargando modelos:', err);
    throw new Error('No se pudieron cargar los modelos de reconocimiento facial. Verifica que los archivos existan en /public/models/');
  }
};

/**
 * Verifica si los modelos ya están cargados en memoria
 */
export const areModelsLoaded = () => modelsLoaded;

/**
 * Detecta un rostro en un elemento de video HTML y retorna su descriptor facial
 * @param {HTMLVideoElement} videoElement - Elemento de video con stream activo
 * @returns {Promise<number[] | null>} Descriptor facial (128 dimensiones) o null si no detectó rostro
 */
export const detectFace = async (videoElement) => {
  if (!modelsLoaded) {
    throw new Error('Los modelos de face-api.js no están cargados. Llama a loadFaceApiModels() primero.');
  }

  try {
    // Ensure video has dimensions set for face-api
    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
       console.warn('Video element has 0 dimensions');
    }

    // Detectar rostro con landmarks y descriptor usando SsdMobilenetv1
    const detection = await faceapi
      .detectSingleFace(videoElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null; // No se detectó ningún rostro
    }

    // Convertir Float32Array a Array normal para serialización JSON
    return Array.from(detection.descriptor);
  } catch (err) {
    console.error('Error detectando rostro:', err);
    return null;
  }
};

/**
 * Compara dos descriptores faciales usando distancia euclidiana
 * @param {number[]} descriptor1 - Descriptor almacenado (del registro)
 * @param {number[]} descriptor2 - Descriptor capturado (verificación en vivo)
 * @param {number} threshold - Umbral de similitud (default: 0.6)
 * @returns {{ match: boolean, distance: number, confidence: number }}
 */
export const compareFaces = (descriptor1, descriptor2, threshold = FACE_MATCH_THRESHOLD) => {
  if (!descriptor1 || !descriptor2) {
    return { match: false, distance: Infinity, confidence: 0 };
  }

  // Convertir a Float32Array para el cálculo de distancia de face-api.js
  const d1 = new Float32Array(descriptor1);
  const d2 = new Float32Array(descriptor2);

  const distance = faceapi.euclideanDistance(d1, d2);
  
  // Calcular confianza como porcentaje inverso a la distancia
  // distancia 0 = 100% confianza, distancia >= threshold = 0%
  const confidence = Math.max(0, Math.min(100, Math.round((1 - distance / threshold) * 100)));

  return {
    match: distance <= threshold,
    distance: Math.round(distance * 1000) / 1000, // Redondear a 3 decimales
    confidence
  };
};

/**
 * Obtiene las dimensiones de la detección del rostro para overlay visual
 * @param {HTMLVideoElement} videoElement 
 * @returns {Promise<{x, y, width, height} | null>}
 */
export const detectFaceBox = async (videoElement) => {
  if (!modelsLoaded) return null;

  try {
    const detection = await faceapi.detectSingleFace(videoElement);
    if (!detection) return null;

    return {
      x: detection.box.x,
      y: detection.box.y,
      width: detection.box.width,
      height: detection.box.height,
      score: detection.score
    };
  } catch {
    return null;
  }
};

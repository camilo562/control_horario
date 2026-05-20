import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, ScanFace } from 'lucide-react';
import CameraCapture from './CameraCapture';
import { loadFaceApiModels, detectFace } from '../../services/faceApi';
import { useApp } from '../../context/AppContext';

export default function FaceRegistrationModal({ user, onClose }) {
  const { registrarRostro } = useApp();
  
  const [status, setStatus] = useState('loading_models'); // loading_models, ready, scanning, success, error
  const [videoEl, setVideoEl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    
    const initModels = async () => {
      try {
        await loadFaceApiModels();
        if (mounted) setStatus('ready');
      } catch (err) {
        console.error('❌ Error cargando modelos:', err);
        if (mounted) {
          setStatus('error');
          setErrorMsg('No se pudieron cargar los modelos de IA. Verifica tu conexión y recarga la página.');
        }
      }
    };

    initModels();
    return () => { mounted = false; };
  }, []);

  const handleVideoReady = (video) => {
    setVideoEl(video);
  };

  const handleCapture = async () => {
    if (!videoEl || status !== 'ready') return;
    
    setStatus('scanning');
    setErrorMsg('');

    try {
      // Verificar que el video esté listo
      if (!videoEl || videoEl.readyState < 2) {
        setStatus('error');
        setErrorMsg('La cámara no está lista todavía. Espera un momento e intenta de nuevo.');
        return;
      }

      // Detectar rostro con timeout de 15 segundos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 15000)
      );
      
      const descriptor = await Promise.race([detectFace(videoEl), timeoutPromise]);
      
      if (!descriptor) {
        setStatus('error');
        setErrorMsg('No se detectó ningún rostro. Asegúrate de mirar directo a la cámara con buena iluminación y sin objetos que cubran tu cara.');
        return;
      }

      await registrarRostro(user.id, descriptor);
      
      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      console.error('❌ Error en captura facial:', err);
      if (err.message === 'TIMEOUT') {
        setStatus('error');
        setErrorMsg('El análisis tardó demasiado. Asegúrate de tener buena iluminación y mirar directo a la cámara.');
      } else if (err.message?.includes('modelos')) {
        setStatus('error');
        setErrorMsg('Los modelos de IA no están cargados. Por favor recarga la página e intenta de nuevo.');
      } else {
        setStatus('error');
        setErrorMsg(`Error: ${err.message || 'Problema desconocido. Intenta de nuevo.'}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-dark-900 border border-brand-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl relative shadow-brand-500/10">
        <button 
          onClick={onClose}
          disabled={status === 'success'}
          className="absolute top-4 right-4 p-1.5 hover:bg-dark-800 rounded-xl text-slate-450 hover:text-white transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-400 mx-auto mb-3">
            <ScanFace className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Registro Facial</h3>
          <p className="text-sm text-slate-400 mt-1">Registrando a <span className="font-bold text-white">{user.nombre}</span></p>
        </div>

        {status === 'loading_models' && (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-400">Cargando motores de IA facial...</p>
          </div>
        )}

        {(status === 'ready' || status === 'scanning' || status === 'error') && (
          <div className="space-y-4">
            <CameraCapture 
              onVideoReady={handleVideoReady} 
              isScanning={status === 'scanning'} 
            />
            
            <p className="text-xs text-center text-slate-400 px-4">
              Alinea el rostro dentro del óvalo. Asegúrate de estar en un lugar iluminado y sin gafas oscuras o accesorios que cubran la cara.
            </p>

            {status === 'error' && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{errorMsg}</p>
              </div>
            )}

            <button
              onClick={status === 'error' ? () => setStatus('ready') : handleCapture}
              disabled={status === 'scanning'}
              className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${
                status === 'error'
                  ? 'bg-dark-800 hover:bg-dark-750 text-white border border-dark-700'
                  : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/20 disabled:bg-brand-600/50'
              }`}
            >
              {status === 'scanning' ? 'Analizando rostro...' : status === 'error' ? 'Reintentar' : 'Capturar Face ID'}
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-10 animate-slideDown">
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
            <h4 className="text-lg font-bold text-white">¡Rostro Registrado!</h4>
            <p className="text-sm text-slate-400 mt-2 text-center">
              El Face ID de {user.nombre} se guardó correctamente.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

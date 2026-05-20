import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';

export default function CameraCapture({ onVideoReady, isScanning }) {
  const videoRef = useRef(null);
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let stream = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setHasError(true);
        setErrorMsg('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleVideoPlay = () => {
    if (videoRef.current) {
      videoRef.current.width = videoRef.current.videoWidth;
      videoRef.current.height = videoRef.current.videoHeight;
    }
    if (onVideoReady && videoRef.current) {
      onVideoReady(videoRef.current);
    }
  };

  if (hasError) {
    return (
      <div className="w-full aspect-video bg-dark-850 rounded-2xl border border-red-500/20 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
        <p className="text-sm font-semibold text-red-400">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border-2 border-dark-700">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onPlay={handleVideoPlay}
        className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
      />
      
      {/* Face Guide Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
        <div 
          className={`w-[60%] h-[70%] rounded-[100%] border-4 transition-colors duration-300 ${
            isScanning ? 'border-brand-500 animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'border-slate-400/50'
          }`}
        />
      </div>

      {!videoRef.current?.srcObject && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-slate-500 bg-dark-900">
          <Camera className="w-8 h-8 mb-2 animate-pulse" />
          <span className="text-xs font-semibold">Iniciando cámara...</span>
        </div>
      )}
    </div>
  );
}

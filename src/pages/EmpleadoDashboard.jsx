import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatSeconds, formatTimeOnly } from '../utils/formatters';
import { Clock, Play, Pause, Square, AlertCircle, ArrowRight, ScanFace } from 'lucide-react';
import FaceVerificationModal from '../components/ui/FaceVerificationModal';

export default function EmpleadoDashboard() {
  const { 
    currentUser,
    activeShift, 
    elapsedSeconds, 
    motivosPausa,
    iniciarJornada, 
    pausarJornada,
    reanudarJornada,
    finalizarJornada 
  } = useApp();

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [selectedMotivo, setSelectedMotivo] = useState('');
  const [otroMotivo, setOtroMotivo] = useState('');
  const [errorText, setErrorText] = useState('');
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [showNoFaceIdWarning, setShowNoFaceIdWarning] = useState(false);

  const handleIniciarJornadaRequest = () => {
    if (currentUser?.face_descriptor) {
      setShowFaceVerification(true);
    } else {
      setShowNoFaceIdWarning(true);
    }
  };

  const handlePauseRequest = () => {
    // Populate active reasons and show modal
    const activeReasons = motivosPausa.filter(m => m.activo);
    if (activeReasons.length > 0) {
      setSelectedMotivo(activeReasons[0].nombre);
    } else {
      setSelectedMotivo('Otro');
    }
    setErrorText('');
    setOtroMotivo('');
    setShowPauseModal(true);
  };

  const handleConfirmPause = () => {
    const detail = otroMotivo.trim();
    if (selectedMotivo === 'Otro' && !detail) {
      setErrorText('Por favor escribe la justificación de tu pausa.');
      return;
    }
    
    const finalReason = selectedMotivo === 'Otro' 
      ? detail 
      : (detail ? `${selectedMotivo} - ${detail}` : selectedMotivo);

    pausarJornada(finalReason);
    setShowPauseModal(false);
  };

  // Determine active state tag colors and texts
  let statusText = 'Inactivo';
  let statusColor = 'text-slate-400';
  let dotColor = 'bg-slate-500';
  if (activeShift) {
    if (activeShift.estado === 'activo') {
      statusText = 'Activo';
      statusColor = 'text-emerald-400';
      dotColor = 'bg-emerald-500';
    } else if (activeShift.estado === 'pausado') {
      statusText = 'Pausado';
      statusColor = 'text-yellow-400';
      dotColor = 'bg-yellow-500';
    }
  }

  // Get active pause reason if paused
  const currentPause = (activeShift?.pausas || []).find(p => p && p.hora_fin === null);

  const announcements = [
    {
      id: 1,
      title: 'Nuevo diseño disponible',
      desc: 'Interfaz mejorada en el sistema.',
      color: 'border-brand-500/30 text-brand-400 bg-brand-500/5'
    },
    {
      id: 2,
      title: 'Proceso operativo actualizado',
      desc: 'Cambios en el flujo de trabajo.',
      color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5'
    },
    {
      id: 3,
      title: 'Entrega de dispositivos informáticos',
      desc: 'Equipo disponible para recolección.',
      color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
    }
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl mx-auto w-full">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Resumen Diario (lg:span-4) */}
        <div className="lg:col-span-4 bg-dark-900 border border-dark-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="w-1 h-5 rounded-full bg-brand-500" />
              <h3 className="text-lg font-bold text-white">Resumen Diario</h3>
            </div>

            <div className="space-y-6">
              {/* Status Row */}
              <div className="bg-dark-850 border border-dark-800 rounded-2xl p-4 flex flex-col justify-center">
                <span className="text-xs text-slate-400 mb-1">Estado</span>
                <span className={`text-xl font-bold ${statusColor} flex items-center gap-2`}>
                  <span className={`w-2 h-2 rounded-full ${dotColor} ${activeShift?.estado === 'activo' ? 'animate-pulse' : ''}`} />
                  {statusText}
                </span>
                {activeShift?.estado === 'pausado' && currentPause && (
                  <span className="text-xs text-yellow-500/80 mt-1 italic">
                    Motivo: {currentPause.motivo}
                  </span>
                )}
              </div>

              {/* Entry Row */}
              <div className="bg-dark-850 border border-dark-800 rounded-2xl p-4 flex flex-col justify-center">
                <span className="text-xs text-slate-400 mb-1">Entrada</span>
                <span className="text-xl font-bold text-white">
                  {activeShift ? formatTimeOnly(activeShift.hora_entrada) : '--:--:--'}
                </span>
              </div>

              {/* Exit Row */}
              <div className="bg-dark-850 border border-dark-800 rounded-2xl p-4 flex flex-col justify-center">
                <span className="text-xs text-slate-400 mb-1">Salida</span>
                <span className="text-xl font-bold text-white">
                  {activeShift?.hora_salida ? formatTimeOnly(activeShift.hora_salida) : '--:--:--'}
                </span>
              </div>
            </div>
          </div>

          {/* Net Time display */}
          <div className="bg-dark-850 border border-dark-800 rounded-2xl p-4 mt-6 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">Tiempo neto</span>
              <div className="text-2xl font-bold font-mono text-white tracking-wider mt-0.5">
                {formatSeconds(elapsedSeconds)}
              </div>
            </div>
            <Clock className="w-8 h-8 text-slate-500" />
          </div>
        </div>

        {/* Middle Column: Cronómetro (lg:span-4) - Glowing Blue Border */}
        <div className="lg:col-span-4 bg-dark-900 border-2 border-brand-500 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-between min-h-[460px] shadow-brand-500/5 relative overflow-hidden">
          
          <div className="w-full">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-1 h-5 rounded-full bg-brand-500" />
              <h3 className="text-lg font-bold text-white">Cronómetro</h3>
            </div>
          </div>

          {/* Giant Clock Numbers */}
          <div className="flex flex-col items-center py-6">
            <div className="text-5xl font-extrabold tracking-widest font-mono text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-yellow-400 to-yellow-500 drop-shadow-glow glow-effect leading-none">
              {formatSeconds(elapsedSeconds)}
            </div>
            <span className="text-xs text-slate-400 mt-4 uppercase tracking-widest">
              Tiempo de jornada
            </span>
            <div className="flex items-center gap-1.5 mt-3">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${activeShift?.estado === 'activo' ? 'animate-pulse' : ''}`} />
              <span className="text-xs text-slate-400 italic">
                {activeShift?.estado === 'activo' 
                  ? 'En progreso' 
                  : activeShift?.estado === 'pausado' 
                  ? 'Pausado' 
                  : 'Sin iniciar jornada'}
              </span>
            </div>
          </div>

          {/* Button Grid (2x2 matching mockup) */}
          <div className="w-full grid grid-cols-2 gap-4 mt-6">
            {/* Iniciar Button */}
            <button
              onClick={handleIniciarJornadaRequest}
              disabled={!!activeShift}
              className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all duration-200 ${
                !activeShift
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95'
                  : 'bg-dark-800 text-slate-600 border border-dark-750 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar</span>
            </button>

            {/* Pausar Button */}
            <button
              onClick={handlePauseRequest}
              disabled={!activeShift || activeShift.estado === 'pausado'}
              className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all duration-200 ${
                activeShift && activeShift.estado === 'activo'
                  ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20 active:scale-95'
                  : 'bg-dark-800 text-slate-600 border border-dark-750 cursor-not-allowed'
              }`}
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pausar</span>
            </button>

            {/* Reanudar Button */}
            <button
              onClick={reanudarJornada}
              disabled={!activeShift || activeShift.estado !== 'pausado'}
              className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all duration-200 ${
                activeShift && activeShift.estado === 'pausado'
                  ? 'text-brand-400 hover:text-brand-300 hover:bg-brand-500/5 active:scale-95'
                  : 'text-slate-650 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Reanudar</span>
            </button>

            {/* Finalizar Button */}
            <button
              onClick={finalizarJornada}
              disabled={!activeShift}
              className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all duration-200 ${
                activeShift
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 active:scale-95'
                  : 'bg-dark-800 text-slate-600 border border-dark-750 cursor-not-allowed'
              }`}
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Finalizar</span>
            </button>
          </div>
        </div>

        {/* Right Column: Últimos anuncios (lg:span-4) */}
        <div className="lg:col-span-4 bg-dark-900 border border-dark-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="w-1 h-5 rounded-full bg-yellow-500" />
              <h3 className="text-lg font-bold text-white">Últimos anuncios</h3>
            </div>

            <div className="space-y-4">
              {announcements.map((ann, idx) => (
                <div 
                  key={ann.id} 
                  className={`border border-dark-800 bg-dark-850 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all duration-200`}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-500" style={{
                    backgroundColor: idx === 0 ? '#3b82f6' : idx === 1 ? '#eab308' : '#10b981'
                  }} />
                  <h4 className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors mb-1">
                    {ann.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {ann.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => alert('Próximamente más anuncios.')}
            className="w-full flex items-center justify-between p-4 bg-dark-850 hover:bg-dark-800 border border-dark-800 hover:border-slate-700/60 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white transition-all group mt-6"
          >
            <span>Ver historial de anuncios</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>

      {/* --- RF-04: PAUSE MOTIVO JUSTIFICATION MODAL --- */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-dark-900 border border-dark-700 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center gap-3 text-yellow-500 mb-4">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-xl font-bold text-white">Justificar Pausa</h3>
            </div>
            
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              De acuerdo con las políticas operativas, debes registrar obligatoriamente la razón de la interrupción antes de detener tu cronómetro de jornada.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Selecciona una categoría:
                </label>
                <select
                  value={selectedMotivo}
                  onChange={(e) => {
                    setSelectedMotivo(e.target.value);
                    setErrorText('');
                  }}
                  className="w-full bg-dark-800 border border-dark-750 text-white rounded-xl px-4 py-3 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                >
                  {motivosPausa.filter(m => m.activo).map(mot => (
                    <option key={mot.id} value={mot.nombre}>{mot.nombre}</option>
                  ))}
                  <option value="Otro">Otro motivo (especificar abajo)</option>
                </select>
              </div>

              {/* Text Form Justification Input */}
              <div className="animate-slideDown">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {selectedMotivo === 'Otro' ? 'Motivo específico (Obligatorio):' : 'Detalles adicionales (Opcional):'}
                </label>
                <input
                  type="text"
                  value={otroMotivo}
                  onChange={(e) => {
                    setOtroMotivo(e.target.value);
                    setErrorText('');
                  }}
                  placeholder={selectedMotivo === 'Otro' ? "Ej. Trámite urgente en la EPS o Falla de Conexión" : "Ej. Almorzar con el equipo, descanso visual, etc."}
                  className="w-full bg-dark-800 border border-dark-750 text-white rounded-xl px-4 py-3 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>

              {errorText && (
                <p className="text-xs text-red-400 font-medium">{errorText}</p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPauseModal(false)}
                  className="flex-1 py-3 bg-dark-800 hover:bg-dark-750 hover:text-white border border-dark-700 text-slate-400 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPause}
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-brand-600/20 active:scale-95 transition-all"
                >
                  Confirmar Pausa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FACE VERIFICATION MODAL --- */}
      {showFaceVerification && (
        <FaceVerificationModal
          user={currentUser}
          onSuccess={() => {
            setShowFaceVerification(false);
            iniciarJornada();
          }}
          onClose={() => setShowFaceVerification(false)}
        />
      )}

      {/* --- NO FACE ID WARNING MODAL --- */}
      {showNoFaceIdWarning && (
        <div className="fixed inset-0 bg-dark-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-dark-900 border border-brand-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl relative shadow-brand-500/10 text-center">
            <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-400 mx-auto mb-4">
              <ScanFace className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¡Hola, {currentUser?.nombre.split(' ')[0]}! 👋</h3>
            <p className="text-sm text-slate-400 mb-6 px-2 leading-relaxed">
              Vemos que aún no tienes tu Face ID configurado. Por ahora iniciaremos tu jornada de forma manual, pero te recomendamos pedirle a un administrador que registre tu rostro pronto para que tu ingreso sea más rápido y seguro.
            </p>
            <button
              onClick={() => {
                setShowNoFaceIdWarning(false);
                iniciarJornada();
              }}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-600/20 transition-all active:scale-95"
            >
              Entendido, iniciar jornada
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, Mail, Lock, User, Briefcase, Shield, ArrowRight, Eye, EyeOff, Phone, MessageCircle, KeyRound } from 'lucide-react';
import {
  CODIGOS_PAIS_WHATSAPP,
  DEFAULT_COUNTRY_CODE,
  ejemploPorCodigoPais,
  solicitarCodigoOtpWhatsapp,
  verificarCodigoOtpWhatsapp,
  validarTelefonoWhatsapp
} from '../verificacion_whatsapp';

export default function AuthPage() {
  const { isSupabaseConfigured, signIn, signUp } = useApp();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cargo, setCargo] = useState('Operario de Confección');
  const [rol, setRol] = useState('Empleado');
  const [codigoPais, setCodigoPais] = useState(DEFAULT_COUNTRY_CODE);
  const [celular, setCelular] = useState('');
  const [codigoOtp, setCodigoOtp] = useState('');
  const [otpSolicitado, setOtpSolicitado] = useState(false);
  const [otpEnviando, setOtpEnviando] = useState(false);

  // UI feedback states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setNombre('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setCodigoPais(DEFAULT_COUNTRY_CODE);
    setCelular('');
    setCodigoOtp('');
    setOtpSolicitado(false);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const resetOtpState = () => {
    setCodigoOtp('');
    setOtpSolicitado(false);
  };

  const handleSolicitarOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!isSupabaseConfigured()) {
      setErrorMsg('La base de datos no esta configurada. No se enviara OTP ni se guardaran registros en modo local.');
      return;
    }

    const validation = validarTelefonoWhatsapp({ codigoPais, celular });
    if (!validation.ok) {
      setErrorMsg(validation.error);
      return;
    }

    setOtpEnviando(true);
    try {
      const res = await solicitarCodigoOtpWhatsapp({ codigoPais, celular, nombre: nombre.trim() });
      if (!res.ok) {
        setErrorMsg(res.error || 'No se pudo enviar el codigo OTP.');
        return;
      }

      setOtpSolicitado(true);
      setSuccessMsg(`Codigo OTP enviado por WhatsApp a +${res.telefono.telefono_whatsapp}.`);
    } catch (err) {
      setErrorMsg('No se pudo solicitar el codigo OTP.');
      console.error(err);
    } finally {
      setOtpEnviando(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!email || !password) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMsg('La base de datos no esta configurada. El ingreso solo funciona con Supabase activo.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await signIn(email, password);
      if (res && res.error) {
        setErrorMsg(res.error.message || 'Credenciales incorrectas.');
      } else {
        setSuccessMsg('¡Sesión iniciada con éxito! Redirigiendo...');
      }
    } catch (err) {
      setErrorMsg('Error al conectar con la base de datos.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isSupabaseConfigured()) {
      setErrorMsg('La base de datos no esta configurada. No se crearan usuarios en modo local.');
      return;
    }

    // Validations (Rule 3.5)
    if (!nombre || !email || !password || !confirmPassword || !celular) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    const phoneValidation = validarTelefonoWhatsapp({ codigoPais, celular });
    if (!phoneValidation.ok) {
      setErrorMsg(phoneValidation.error);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    if (!otpSolicitado) {
      setErrorMsg('Primero valida el celular enviando el codigo OTP por WhatsApp.');
      return;
    }

    if (!codigoOtp) {
      setErrorMsg('Ingresa el codigo OTP recibido por WhatsApp.');
      return;
    }

    const otpValidation = verificarCodigoOtpWhatsapp({ codigoPais, celular, codigoOtp });
    if (!otpValidation.ok) {
      setErrorMsg(otpValidation.error);
      return;
    }

    setSubmitting(true);
    try {
      const res = await signUp(nombre, email, cargo, rol, password, otpValidation.telefono);
      if (res && res.error) {
        setErrorMsg(res.error.message || 'Error al registrar usuario.');
      } else {
        setSuccessMsg('¡Registro exitoso! Por favor revisa tu correo electrónico para confirmar la cuenta (o inicia sesión directamente si desactivaste la confirmación de correo en Supabase).');
        // Switch to login tab after brief delay
        setTimeout(() => {
          setIsRegistering(false);
          setPassword('');
          setConfirmPassword('');
          setCodigoOtp('');
          setOtpSolicitado(false);
          setErrorMsg('');
          setSuccessMsg('');
        }, 4000);
      }
    } catch (err) {
      setErrorMsg('Ocurrió un error inesperado al guardar el perfil.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-dark-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative Brand Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[65%] h-[65%] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        
        {/* Connection status banner */}
        {!isSupabaseConfigured() && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center text-red-300 text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span><strong>Base de datos requerida:</strong> Supabase no esta configurado. No se guardaran registros locales.</span>
          </div>
        )}

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-xl shadow-brand-600/20 mx-auto">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-white font-outfit tracking-tight">SAMMERS-JEANS</h1>
          <p className="text-xs text-slate-400">Sistema Automatizado de Control Horario</p>
        </div>

        {/* Authentication Card */}
        <div className="bg-dark-900 border border-dark-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
          
          {/* Header tabs switcher */}
          <div className="flex bg-dark-950 p-1 rounded-xl border border-dark-800 mb-6">
            <button
              onClick={() => { setIsRegistering(false); resetForm(); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${!isRegistering ? 'bg-brand-600 text-white shadow-md shadow-brand-600/10' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setIsRegistering(true); resetForm(); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${isRegistering ? 'bg-brand-600 text-white shadow-md shadow-brand-600/10' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Registrarse
            </button>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium animate-fadeIn">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium animate-fadeIn leading-relaxed">
              {successMsg}
            </div>
          )}

          {/* Main auth forms */}
          {!isRegistering ? (
            /* --- LOGIN FORM --- */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email corporativo:</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@sammersjeans.com"
                    className="w-full bg-dark-950 border border-dark-750 text-white rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Contraseña:</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-dark-950 border border-dark-750 text-white rounded-xl pl-11 pr-12 py-3.5 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 mt-6 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-brand-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? 'Verificando...' : 'Ingresar al sistema'}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            /* --- REGISTER FORM --- */
            <form onSubmit={handleRegister} className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre completo:</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Carlos Pérez"
                    className="w-full bg-dark-950 border border-dark-750 text-white rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email corporativo:</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@sammersjeans.com"
                    className="w-full bg-dark-950 border border-dark-750 text-white rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-[minmax(0,1fr)_1.25fr] gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pais:</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
                      <select
                        value={codigoPais}
                        onChange={(e) => { setCodigoPais(e.target.value); resetOtpState(); }}
                        className="w-full bg-dark-950 border border-dark-750 text-white rounded-xl pl-9 pr-2 py-3 text-xs focus:border-brand-500 focus:outline-none transition-colors appearance-none"
                      >
                        {CODIGOS_PAIS_WHATSAPP.map((pais) => (
                          <option key={`${pais.iso}-${pais.codigo}`} value={pais.codigo}>
                            {pais.nombre} {pais.codigo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Celular WhatsApp:</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={celular}
                        onChange={(e) => { setCelular(e.target.value.replace(/\D+/g, '').slice(0, 14)); resetOtpState(); }}
                        placeholder={ejemploPorCodigoPais(codigoPais)}
                        className="w-full bg-dark-950 border border-dark-750 text-white rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSolicitarOtp}
                  disabled={otpEnviando || submitting || !isSupabaseConfigured()}
                  className="w-full py-3 bg-emerald-600/90 hover:bg-emerald-500 disabled:bg-emerald-600/40 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  {otpEnviando ? 'Enviando codigo...' : otpSolicitado ? 'Reenviar codigo' : 'Validar codigo'}
                </button>
              </div>

              {otpSolicitado && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Codigo OTP:</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={codigoOtp}
                      onChange={(e) => setCodigoOtp(e.target.value.replace(/\D+/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="w-full bg-dark-950 border border-dark-750 text-white rounded-xl pl-11 pr-4 py-3.5 text-sm tracking-[0.25em] focus:border-brand-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cargo:</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
                    <select
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      className="w-full bg-dark-950 border border-dark-750 text-white rounded-xl pl-9 pr-2 py-3 text-xs focus:border-brand-500 focus:outline-none transition-colors appearance-none"
                    >
                      <option value="Operario de Confección">Operario</option>
                      <option value="Auxiliar de Logística">Logística</option>
                      <option value="Diseñadora de Moda">Diseñador/a</option>
                      <option value="Directora de Operaciones / RRHH">Recursos Humanos</option>
                      <option value="Administrador General">Administrador</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Rol del sistema:</label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
                    <select
                      value={rol}
                      onChange={(e) => setRol(e.target.value)}
                      className="w-full bg-dark-950 border border-dark-750 text-white rounded-xl pl-9 pr-2 py-3 text-xs focus:border-brand-500 focus:outline-none transition-colors appearance-none"
                    >
                      <option value="Empleado">Empleado</option>
                      <option value="Administrador">Administrador</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Contraseña (Mínimo 6 caracteres):</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-dark-950 border border-dark-750 text-white rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Confirmar contraseña:</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-dark-950 border border-dark-750 text-white rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !isSupabaseConfigured()}
                className="w-full py-4 mt-6 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-brand-600/20 active:scale-95 transition-all"
              >
                {submitting ? 'Creando cuenta...' : 'Crear mi cuenta'}
              </button>
            </form>
          )}

        </div>
        
        {/* Footer legalities */}
        <div className="text-center text-[10px] text-slate-500">
          Al ingresar, aceptas el monitoreo de tiempos para efectos de nómina laboral.
          <br />SAMMERS-JEANS Colombia © 2026.
        </div>

      </div>
    </div>
  );
}

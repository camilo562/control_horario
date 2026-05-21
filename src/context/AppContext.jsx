import React, { createContext, useContext, useState, useEffect } from 'react';
import { calculateNetTime } from '../utils/formatters';
import { dbService } from '../services/db';
import { supabase } from '../services/supabase';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [motivosPausa, setMotivosPausa] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Helper to determine if we should use Supabase or fallback to localStorage
  const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return url && key && !url.includes('ybwawtzaaznrsrxofoow') && !url.includes('tu_proyecto_url');
  };

  // Centralized authentication profile handler
  const handleAuthUser = async (sbUser) => {
    try {
      const uList = await dbService.getUsuarios();
      setUsers(uList);

      let profile = uList.find(u => u.id === sbUser.id);
      
      // Fallback: If they successfully registered in Auth but profile row is missing in public.usuarios, create it
      if (!profile) {
        const metadata = sbUser.user_metadata || {};
        const nombre = metadata.nombre || sbUser.email.split('@')[0];
        profile = {
          id: sbUser.id,
          nombre,
          email: sbUser.email,
          rol: metadata.rol || 'Empleado',
          avatar: nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          cargo: metadata.cargo || 'Operario de Confección',
          telefono_codigo_pais: metadata.telefono_codigo_pais || '',
          telefono_numero: metadata.telefono_numero || '',
          telefono_whatsapp: metadata.telefono_whatsapp || '',
          activo: true
        };
        await dbService.insertUsuario(profile);
        setUsers(prev => [...prev, profile]);
      }

      setCurrentUser(profile);
      localStorage.setItem('ch_current_user', JSON.stringify(profile));

      // Load all workspace resources for the logged-in user
      const [mList, sList, aList, active] = await Promise.all([
        dbService.getMotivosPausa(),
        dbService.getHistorialGlobal(),
        dbService.getAuditLogs(),
        dbService.getJornadaActiva(profile.id)
      ]);

      setMotivosPausa(mList);
      setShifts(sList);
      setAuditLogs(aList);
      setActiveShift(active);
    } catch (err) {
      console.error('Error fetching user data from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  // Setup authentication subscription listeners
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Offline simulated driver boot sequence
      const mockInit = async () => {
        try {
          const uList = await dbService.getUsuarios();
          setUsers(uList);
          const saved = localStorage.getItem('ch_current_user');
          if (saved) {
            const parsed = JSON.parse(saved);
            const found = uList.find(u => u.id === parsed.id);
            setCurrentUser(found || null);
          }
        } catch (err) {
          console.error('Failed to boot local simulated state:', err);
        } finally {
          setLoading(false);
        }
      };
      mockInit();
      return;
    }

    setLoading(true);

    // Get current session active on mount
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('Supabase session error:', error);
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      if (session?.user) {
        await handleAuthUser(session.user);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    }).catch(err => {
      console.error('Unexpected error in getSession:', err);
      setCurrentUser(null);
      setLoading(false);
    });

    // Listen to real-time authentication state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await handleAuthUser(session.user);
      } else {
        setCurrentUser(null);
        setActiveShift(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. Real-time ticking logic for active shift
  useEffect(() => {
    if (!activeShift) {
      setElapsedSeconds(0);
      return;
    }

    setElapsedSeconds(
      calculateNetTime(activeShift.hora_entrada, null, activeShift.pausas)
    );

    const interval = setInterval(() => {
      setElapsedSeconds(
        calculateNetTime(activeShift.hora_entrada, null, activeShift.pausas)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [activeShift]);

  // Simulated profile switcher helper (used in Local Switcher card)
  const loginAsUser = async (userId) => {
    if (isSupabaseConfigured()) {
      alert('Cambio rápido no disponible en modo Supabase. Por favor cierra sesión para cambiar de cuenta.');
      return;
    }
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('ch_current_user', JSON.stringify(user));
      
      setLoading(true);
      const active = await dbService.getJornadaActiva(userId);
      setActiveShift(active);
      setLoading(false);
    }
  };

  // --- AUTHENTICATION ACTIONS ---

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured()) {
      // Local Mock Driver Login
      const uList = await dbService.getUsuarios();
      const found = uList.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (found) {
        if (!found.activo) {
          return { error: { message: 'Esta cuenta ha sido desactivada por el administrador.' } };
        }
        setCurrentUser(found);
        localStorage.setItem('ch_current_user', JSON.stringify(found));
        
        setLoading(true);
        const active = await dbService.getJornadaActiva(found.id);
        setActiveShift(active);
        setLoading(false);
        return { data: { user: found }, error: null };
      }
      return { error: { message: 'El correo electrónico no está registrado en el simulador local.' } };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      return { data, error };
    } catch (err) {
      return { error: err };
    }
  };

  const signUp = async (nombre, email, cargo, rol, password, telefono = {}) => {
    if (!isSupabaseConfigured()) {
      // Local Mock Driver Register
      const uList = await dbService.getUsuarios();
      const emailExists = uList.some(u => u.email.toLowerCase() === email.toLowerCase());
      const phoneExists = telefono.telefono_whatsapp
        ? uList.some(u => u.telefono_whatsapp === telefono.telefono_whatsapp)
        : false;

      if (emailExists) {
        return { error: { message: 'El correo electronico ya esta registrado.' } };
      }

      if (phoneExists) {
        return { error: { message: 'Este celular ya esta registrado con otro usuario.' } };
      }

      const newUser = {
        id: `u-${Date.now()}`,
        nombre,
        email,
        rol,
        avatar: nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        cargo,
        telefono_codigo_pais: telefono.telefono_codigo_pais || '',
        telefono_numero: telefono.telefono_numero || '',
        telefono_whatsapp: telefono.telefono_whatsapp || '',
        activo: true,
        creado_en: new Date().toISOString()
      };
      await dbService.insertUsuario(newUser);
      setUsers(prev => [...prev, newUser]);
      return { data: { user: newUser }, error: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            cargo,
            rol,
            telefono_codigo_pais: telefono.telefono_codigo_pais || '',
            telefono_numero: telefono.telefono_numero || '',
            telefono_whatsapp: telefono.telefono_whatsapp || ''
          }
        }
      });

      if (error) return { error };

      if (data.user) {
        const profile = {
          id: data.user.id,
          nombre,
          email,
          rol,
          avatar: nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          cargo,
          telefono_codigo_pais: telefono.telefono_codigo_pais || '',
          telefono_numero: telefono.telefono_numero || '',
          telefono_whatsapp: telefono.telefono_whatsapp || '',
          activo: true
        };
        await dbService.insertUsuario(profile);
      }
      return { data, error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
      setCurrentUser(null);
      setActiveShift(null);
      localStorage.removeItem('ch_current_user');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  // --- BUSINESS LOGIC: SHIFT TRANSITIONS (RF-01 to RF-06 & RF-17) ---

  const iniciarJornada = async () => {
    if (activeShift) {
      alert('Ya existe una jornada activa.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newShift = {
      id: `s-${currentUser.id}-${Date.now()}`,
      usuario_id: currentUser.id,
      fecha: todayStr,
      hora_entrada: new Date().toISOString(),
      hora_salida: null,
      estado: 'activo',
      pausas: [],
      tiempo_neto: 0
    };

    try {
      const savedShift = await dbService.registrarEntrada(newShift);
      setActiveShift(savedShift);
      setShifts(prev => [savedShift, ...prev]);
    } catch (err) {
      console.error('Error starting shift:', err);
    }
  };

  const pausarJornada = async (motivo) => {
    if (!activeShift) return;
    if (activeShift.estado === 'pausado') return;

    const pauseItem = {
      id: `p-${Date.now()}`,
      jornada_id: activeShift.id,
      motivo,
      hora_inicio: new Date().toISOString(),
      hora_fin: null
    };

    try {
      const savedPause = await dbService.registrarPausa(activeShift.id, pauseItem, currentUser.id);
      const resolvedPause = savedPause || pauseItem;
      const currentPausas = activeShift.pausas || [];

      const updatedShift = {
        ...activeShift,
        estado: 'pausado',
        pausas: [...currentPausas.filter(p => p !== null && p !== undefined), resolvedPause]
      };
      setActiveShift(updatedShift);
      setShifts(prev => prev.map(s => s.id === activeShift.id ? updatedShift : s));
    } catch (err) {
      console.error('Error pausing shift:', err);
    }
  };

  const reanudarJornada = async () => {
    if (!activeShift || activeShift.estado !== 'pausado') return;

    const currentPausas = activeShift.pausas || [];
    const activePause = currentPausas
      .filter(p => p !== null && p !== undefined)
      .find(p => p.hora_fin === null || p.hora_fin === undefined);
    if (!activePause) return;

    const horaFin = new Date().toISOString();

    try {
      await dbService.registrarReanudacion(activeShift.id, activePause.id, horaFin, currentUser.id);
      
      const updatedPausas = currentPausas
        .filter(p => p !== null && p !== undefined)
        .map(p => {
          if (p.id === activePause.id) {
            return { ...p, hora_fin: horaFin };
          }
          return p;
        });

      const updatedShift = {
        ...activeShift,
        estado: 'activo',
        pausas: updatedPausas
      };

      setActiveShift(updatedShift);
      setShifts(prev => prev.map(s => s.id === activeShift.id ? updatedShift : s));
    } catch (err) {
      console.error('Error resuming shift:', err);
    }
  };

  const finalizarJornada = async () => {
    if (!activeShift) return;

    try {
      const horaSalida = new Date().toISOString();
      const currentPausas = activeShift.pausas || [];
      
      // Close any open pauses safely
      const updatedPausas = currentPausas
        .filter(p => p !== null && p !== undefined)
        .map(p => {
          if (p.hora_fin === null || p.hora_fin === undefined) {
            return { ...p, hora_fin: horaSalida };
          }
          return p;
        });

      const netSeconds = calculateNetTime(activeShift.hora_entrada, horaSalida, updatedPausas);

      const openPause = currentPausas
        .filter(p => p !== null && p !== undefined)
        .find(p => p.hora_fin === null || p.hora_fin === undefined);

      if (openPause) {
        await dbService.registrarReanudacion(activeShift.id, openPause.id, horaSalida, currentUser.id);
      }

      await dbService.registrarSalida(activeShift.id, horaSalida, netSeconds, currentUser.id);

      const finalizedShift = {
        ...activeShift,
        hora_salida: horaSalida,
        estado: 'finalizado',
        pausas: updatedPausas,
        tiempo_neto: netSeconds
      };

      setShifts(prev => prev.map(s => s.id === activeShift.id ? finalizedShift : s));
      setActiveShift(null);
    } catch (err) {
      console.error('Error finishing shift:', err);
      // Failsafe: Clear active shift so the UI doesn't get stuck!
      setActiveShift(null);
    }
  };

  // --- ADMIN ACTIONS (RF-13 to RF-16) ---

  const editarRegistroManual = async (shiftId, { hora_entrada, hora_salida, pausas, motivo_edicion }) => {
    const oldShift = shifts.find(s => s.id === shiftId);
    if (!oldShift) return;

    const netSeconds = calculateNetTime(hora_entrada, hora_salida, pausas);

    const updatedShift = {
      ...oldShift,
      hora_entrada,
      hora_salida,
      pausas,
      tiempo_neto: netSeconds
    };

    try {
      await dbService.adminGuardarJornada(updatedShift, pausas);
      setShifts(prev => prev.map(s => s.id === shiftId ? updatedShift : s));

      // Document changes in Audit Log
      const targetUser = users.find(u => u.id === oldShift.usuario_id);
      const newLogs = [];
      const nowIso = new Date().toISOString();

      if (oldShift.hora_entrada !== hora_entrada) {
        const logItem = {
          id: `log-${Date.now()}-1`,
          admin_id: currentUser.id,
          admin_nombre: currentUser.nombre,
          usuario_nombre: targetUser ? targetUser.nombre : 'Usuario Desconocido',
          jornada_id: shiftId,
          campo_modificado: 'Hora Entrada',
          valor_anterior: oldShift.hora_entrada,
          valor_nuevo: hora_entrada,
          motivo_edicion,
          fecha_cambio: nowIso
        };
        await dbService.insertAuditLog(logItem);
        newLogs.push(logItem);
      }

      if (oldShift.hora_salida !== hora_salida) {
        const logItem = {
          id: `log-${Date.now()}-2`,
          admin_id: currentUser.id,
          admin_nombre: currentUser.nombre,
          usuario_nombre: targetUser ? targetUser.nombre : 'Usuario Desconocido',
          jornada_id: shiftId,
          campo_modificado: 'Hora Salida',
          valor_anterior: oldShift.hora_salida || '--:--:--',
          valor_nuevo: hora_salida || '--:--:--',
          motivo_edicion,
          fecha_cambio: nowIso
        };
        await dbService.insertAuditLog(logItem);
        newLogs.push(logItem);
      }

      if (newLogs.length > 0) {
        setAuditLogs(prev => [...newLogs, ...prev]);
      }
    } catch (err) {
      console.error('Error saving manual shift edit:', err);
    }
  };

  const crearUsuario = async (userData) => {
    const newUser = {
      id: `u-${Date.now()}`,
      activo: true,
      avatar: userData.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      ...userData
    };

    try {
      const savedUser = await dbService.insertUsuario(newUser);
      setUsers(prev => [...prev, savedUser]);
    } catch (err) {
      console.error('Error creating user:', err);
    }
  };

  const actualizarUsuario = async (updatedUser) => {
    try {
      const savedUser = await dbService.updateUsuario(updatedUser);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? savedUser : u));
      if (updatedUser.id === currentUser.id) {
        setCurrentUser(savedUser);
      }
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  const eliminarUsuario = async (userId) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    try {
      const updated = { ...target, activo: false };
      const saved = await dbService.updateUsuario(updated);
      setUsers(prev => prev.map(u => u.id === userId ? saved : u));
    } catch (err) {
      console.error('Error deactivating user:', err);
    }
  };

  const crearMotivoPausa = async (nombre) => {
    const newMotivo = {
      id: `m-${Date.now()}`,
      nombre,
      activo: true
    };

    try {
      const saved = await dbService.insertMotivoPausa(newMotivo);
      setMotivosPausa(prev => [...prev, saved]);
    } catch (err) {
      console.error('Error creating pause motive:', err);
    }
  };

  const actualizarMotivoPausa = async (id, nombre, activo) => {
    try {
      const saved = await dbService.updateMotivoPausa(id, nombre, activo);
      setMotivosPausa(prev => prev.map(m => m.id === id ? saved : m));
    } catch (err) {
      console.error('Error updating pause motive:', err);
    }
  };

  const eliminarMotivoPausa = async (id) => {
    try {
      await dbService.deleteMotivoPausa(id);
      setMotivosPausa(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Error deleting pause motive:', err);
    }
  };

  const registrarRostro = async (userId, descriptor) => {
    try {
      const savedUser = await dbService.updateFaceDescriptor(userId, descriptor);
      if (savedUser) {
        setUsers(prev => prev.map(u => u.id === userId ? savedUser : u));
        if (currentUser?.id === userId) {
          setCurrentUser(savedUser);
          localStorage.setItem('ch_current_user', JSON.stringify(savedUser));
        }
      }
    } catch (err) {
      console.error('Error registrando rostro:', err);
      throw err;
    }
  };

  return (
    <AppContext.Provider value={{
      isSupabaseConfigured,
      loading,
      users,
      currentUser,
      shifts,
      motivosPausa,
      auditLogs,
      activeShift,
      elapsedSeconds,
      iniciarJornada,
      pausarJornada,
      reanudarJornada,
      finalizarJornada,
      editarRegistroManual,
      crearUsuario,
      actualizarUsuario,
      eliminarUsuario,
      crearMotivoPausa,
      actualizarMotivoPausa,
      eliminarMotivoPausa,
      registrarRostro,
      loginAsUser,
      signIn,
      signUp,
      signOut
    }}>
      {children}
    </AppContext.Provider>
  );
};

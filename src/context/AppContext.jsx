import { createContext, useContext, useState, useEffect } from 'react';
import { calculateNetTime } from '../utils/formatters';
import { authService, getDatabaseConfigMessage, isDatabaseConfigured } from '../services/api';
import { dbService } from '../services/db';

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

  const loadWorkspaceForUser = async (authUser) => {
    const uList = await dbService.getUsuarios();
    setUsers(uList);

    const profile = uList.find((u) => u.id === authUser.id) || authUser;
    setCurrentUser(profile);

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
    return profile;
  };

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      setLoading(true);
      try {
        const session = await authService.getSession();
        if (!mounted) return;

        if (session.user) {
          await loadWorkspaceForUser(session.user);
        } else {
          setCurrentUser(null);
          setActiveShift(null);
        }
      } catch (err) {
        console.error('Error conectando con la base de datos local:', err);
        if (mounted) {
          setCurrentUser(null);
          setActiveShift(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    boot();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeShift) {
      const timeout = setTimeout(() => setElapsedSeconds(0), 0);
      return () => clearTimeout(timeout);
    }

    const updateElapsedSeconds = () => setElapsedSeconds(
      calculateNetTime(activeShift.hora_entrada, null, activeShift.pausas)
    );

    const timeout = setTimeout(updateElapsedSeconds, 0);
    const interval = setInterval(updateElapsedSeconds, 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [activeShift]);

  const signIn = async (email, password) => {
    try {
      const { user } = await authService.signIn(email, password);
      await loadWorkspaceForUser(user);
      return { data: { user }, error: null };
    } catch (err) {
      return { error: { message: err.message || getDatabaseConfigMessage() } };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (nombre, email, cargo, rol, password, telefono = {}) => {
    try {
      const { user } = await authService.signUp({
        nombre,
        email,
        cargo,
        rol,
        password,
        telefono
      });
      return { data: { user }, error: null };
    } catch (err) {
      return { error: { message: err.message || getDatabaseConfigMessage() } };
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (err) {
      console.error('Error cerrando sesion:', err);
    } finally {
      setCurrentUser(null);
      setActiveShift(null);
      setShifts([]);
      setAuditLogs([]);
    }
  };

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
      setShifts((prev) => [savedShift, ...prev]);
    } catch (err) {
      console.error('Error iniciando jornada:', err);
    }
  };

  const pausarJornada = async (motivo) => {
    if (!activeShift || activeShift.estado === 'pausado') return;

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
        pausas: [...currentPausas.filter((p) => p !== null && p !== undefined), resolvedPause]
      };
      setActiveShift(updatedShift);
      setShifts((prev) => prev.map((s) => (s.id === activeShift.id ? updatedShift : s)));
    } catch (err) {
      console.error('Error pausando jornada:', err);
    }
  };

  const reanudarJornada = async () => {
    if (!activeShift || activeShift.estado !== 'pausado') return;

    const currentPausas = activeShift.pausas || [];
    const activePause = currentPausas
      .filter((p) => p !== null && p !== undefined)
      .find((p) => p.hora_fin === null || p.hora_fin === undefined);
    if (!activePause) return;

    const horaFin = new Date().toISOString();

    try {
      await dbService.registrarReanudacion(activeShift.id, activePause.id, horaFin, currentUser.id);

      const updatedPausas = currentPausas
        .filter((p) => p !== null && p !== undefined)
        .map((p) => (p.id === activePause.id ? { ...p, hora_fin: horaFin } : p));

      const updatedShift = {
        ...activeShift,
        estado: 'activo',
        pausas: updatedPausas
      };

      setActiveShift(updatedShift);
      setShifts((prev) => prev.map((s) => (s.id === activeShift.id ? updatedShift : s)));
    } catch (err) {
      console.error('Error reanudando jornada:', err);
    }
  };

  const finalizarJornada = async () => {
    if (!activeShift) return;

    try {
      const horaSalida = new Date().toISOString();
      const currentPausas = activeShift.pausas || [];

      const updatedPausas = currentPausas
        .filter((p) => p !== null && p !== undefined)
        .map((p) => (
          p.hora_fin === null || p.hora_fin === undefined
            ? { ...p, hora_fin: horaSalida }
            : p
        ));

      const netSeconds = calculateNetTime(activeShift.hora_entrada, horaSalida, updatedPausas);

      const openPause = currentPausas
        .filter((p) => p !== null && p !== undefined)
        .find((p) => p.hora_fin === null || p.hora_fin === undefined);

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

      setShifts((prev) => prev.map((s) => (s.id === activeShift.id ? finalizedShift : s)));
      setActiveShift(null);
    } catch (err) {
      console.error('Error finalizando jornada:', err);
      setActiveShift(null);
    }
  };

  const editarRegistroManual = async (shiftId, { hora_entrada, hora_salida, pausas, motivo_edicion }) => {
    const oldShift = shifts.find((s) => s.id === shiftId);
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
      setShifts((prev) => prev.map((s) => (s.id === shiftId ? updatedShift : s)));

      const targetUser = users.find((u) => u.id === oldShift.usuario_id);
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
        setAuditLogs((prev) => [...newLogs, ...prev]);
      }
    } catch (err) {
      console.error('Error guardando edicion manual:', err);
    }
  };

  const crearUsuario = async (userData) => {
    const newUser = {
      id: `u-${Date.now()}`,
      activo: true,
      avatar: userData.nombre.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
      ...userData
    };

    try {
      const savedUser = await dbService.insertUsuario(newUser);
      setUsers((prev) => [...prev, savedUser]);
    } catch (err) {
      console.error('Error creando usuario:', err);
    }
  };

  const actualizarUsuario = async (updatedUser) => {
    try {
      const savedUser = await dbService.updateUsuario(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? savedUser : u)));
      if (updatedUser.id === currentUser?.id) {
        setCurrentUser(savedUser);
      }
    } catch (err) {
      console.error('Error actualizando usuario:', err);
    }
  };

  const eliminarUsuario = async (userId) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    try {
      const updated = { ...target, activo: false };
      const saved = await dbService.updateUsuario(updated);
      setUsers((prev) => prev.map((u) => (u.id === userId ? saved : u)));
    } catch (err) {
      console.error('Error desactivando usuario:', err);
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
      setMotivosPausa((prev) => [...prev, saved]);
    } catch (err) {
      console.error('Error creando motivo de pausa:', err);
    }
  };

  const actualizarMotivoPausa = async (id, nombre, activo) => {
    try {
      const saved = await dbService.updateMotivoPausa(id, nombre, activo);
      setMotivosPausa((prev) => prev.map((m) => (m.id === id ? saved : m)));
    } catch (err) {
      console.error('Error actualizando motivo de pausa:', err);
    }
  };

  const eliminarMotivoPausa = async (id) => {
    try {
      await dbService.deleteMotivoPausa(id);
      setMotivosPausa((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Error eliminando motivo de pausa:', err);
    }
  };

  const registrarRostro = async (userId, descriptor) => {
    try {
      const savedUser = await dbService.updateFaceDescriptor(userId, descriptor);
      if (savedUser) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? savedUser : u)));
        if (currentUser?.id === userId) {
          setCurrentUser(savedUser);
        }
      }
    } catch (err) {
      console.error('Error registrando rostro:', err);
      throw err;
    }
  };

  return (
    <AppContext.Provider value={{
      isDatabaseConfigured,
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
      signIn,
      signUp,
      signOut
    }}>
      {children}
    </AppContext.Provider>
  );
};

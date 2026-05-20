import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, Shield, User, X, AlertCircle, ScanFace } from 'lucide-react';
import FaceRegistrationModal from '../components/ui/FaceRegistrationModal';

export default function AdminUsuarios() {
  const { users, crearUsuario, actualizarUsuario, eliminarUsuario } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null if creating
  const [faceRegUser, setFaceRegUser] = useState(null); // user to register face
  
  // Form fields
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('Empleado');
  const [cargo, setCargo] = useState('');
  const [errorText, setErrorText] = useState('');

  const openCreateModal = () => {
    setEditingUser(null);
    setNombre('');
    setEmail('');
    setRol('Empleado');
    setCargo('');
    setErrorText('');
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setNombre(user.nombre);
    setEmail(user.email);
    setRol(user.rol);
    setCargo(user.cargo || '');
    setErrorText('');
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setErrorText('');

    if (!nombre.trim() || !email.trim()) {
      setErrorText('El nombre y el correo son obligatorios.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorText('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (editingUser) {
      actualizarUsuario({
        ...editingUser,
        nombre: nombre.trim(),
        email: email.trim(),
        rol,
        cargo: cargo.trim()
      });
    } else {
      crearUsuario({
        nombre: nombre.trim(),
        email: email.trim(),
        rol,
        cargo: cargo.trim()
      });
    }

    setModalOpen(false);
  };

  const handleToggleActive = (user) => {
    if (user.id === 'u-2') {
      alert('No puedes desactivar al administrador principal del sistema.');
      return;
    }
    actualizarUsuario({
      ...user,
      activo: !user.activo
    });
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Banner and Actions */}
      <div className="bg-dark-900 border border-dark-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Gestión de Usuarios</h3>
          <p className="text-xs text-slate-400 mt-1">
            Administra las cuentas de acceso, asignación de cargos y roles del sistema.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-brand-600/10"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Colaborador</span>
        </button>
      </div>

      {/* Users grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => {
          const isActivo = user.activo;

          return (
            <div 
              key={user.id}
              className={`bg-dark-900 border rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all duration-200 ${
                isActivo ? 'border-dark-800' : 'border-red-500/10 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  {/* User Initial Circle */}
                  <div className="w-12 h-12 rounded-2xl bg-dark-800 border border-dark-750 flex items-center justify-center text-slate-300 font-extrabold text-sm shadow-inner">
                    {user.avatar}
                  </div>
                  {/* Role Tag */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${
                    user.rol === 'Administrador' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                  }`}>
                    {user.rol === 'Administrador' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {user.rol}
                  </span>
                </div>

                <div className="mt-4 space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {user.nombre}
                    {!isActivo && (
                      <span className="bg-red-500/10 text-red-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-red-500/20">
                        Inactivo
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">{user.cargo || 'Sin cargo asignado'}</p>
                  <p className="text-xs text-slate-500 font-mono pt-1 truncate">{user.email}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-dark-800">
                <button
                  onClick={() => setFaceRegUser(user)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                    user.face_descriptor
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                      : 'bg-dark-850 hover:bg-dark-800 border-dark-800 hover:border-brand-500/50 text-slate-300 hover:text-brand-400'
                  }`}
                >
                  <ScanFace className="w-4 h-4" />
                  <span>{user.face_descriptor ? 'Face ID Registrado (Actualizar)' : 'Registrar Face ID'}</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(user)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-dark-850 hover:bg-dark-800 border border-dark-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-450" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleToggleActive(user)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                      isActivo
                        ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {isActivo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- CRUD CREATE / EDIT MODAL --- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-dark-900 border border-dark-700 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-dark-800 rounded-xl text-slate-450 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">
              {editingUser ? 'Editar Colaborador' : 'Añadir Colaborador'}
            </h3>

            {errorText && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorText}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Carlos Pérez"
                  className="w-full bg-dark-800 border border-dark-750 text-white rounded-xl px-4 py-3 text-xs focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej. carlos.perez@sammersjeans.com"
                  className="w-full bg-dark-800 border border-dark-750 text-white rounded-xl px-4 py-3 text-xs focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              {/* Cargo */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Cargo / Puesto de Trabajo
                </label>
                <input
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ej. Operario de Confección"
                  className="w-full bg-dark-800 border border-dark-750 text-white rounded-xl px-4 py-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Rol de Acceso
                </label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-750 text-white rounded-xl px-4 py-3 text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="Empleado">Empleado (Fichaje)</option>
                  <option value="Administrador">Administrador (Auditoría/Ajustes)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-dark-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 bg-dark-800 hover:bg-dark-750 hover:text-white border border-dark-700 text-slate-400 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-600/10 transition-all active:scale-95"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FACE REGISTRATION MODAL --- */}
      {faceRegUser && (
        <FaceRegistrationModal
          user={faceRegUser}
          onClose={() => setFaceRegUser(null)}
        />
      )}
    </div>
  );
}

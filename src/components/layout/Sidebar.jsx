import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Clock, 
  History, 
  Users, 
  Settings, 
  LogOut, 
  ShieldAlert, 
  Menu,
  ChevronDown,
  LayoutDashboard,
  Coffee,
  FileCheck
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, setSelectedEmployeeId }) {
  const { currentUser, users, loginAsUser, signOut } = useApp();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const employeeMenu = [
    { id: 'resumen', label: 'Resumen', icon: Clock },
    { id: 'historial', label: 'Historial', icon: History }
  ];

  const adminMenu = [
    { id: 'admin-dashboard', label: 'Tablero Real', icon: LayoutDashboard },
    { id: 'admin-historial', label: 'Historial Global', icon: History },
    { id: 'admin-usuarios', label: 'Gestión Usuarios', icon: Users },
    { id: 'admin-motivos', label: 'Motivos de Pausa', icon: Coffee },
    { id: 'admin-auditoria', label: 'Log de Auditoría', icon: ShieldAlert }
  ];

  const activeMenu = currentUser.rol === 'Administrador' ? adminMenu : employeeMenu;

  const handleMenuClick = (id) => {
    setCurrentTab(id);
    if (id === 'admin-historial' && setSelectedEmployeeId) {
      setSelectedEmployeeId('todos');
    }
  };

  return (
    <aside className="w-80 bg-dark-900 border-r border-dark-700/50 flex flex-col h-screen overflow-hidden text-slate-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-dark-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-600/20">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-tight">Control Horario</h1>
          <p className="text-xs text-slate-500">Registro de jornada</p>
        </div>
      </div>

      {/* Current User Card with Quick Switcher */}
      <div className="p-4 border-b border-dark-800">
        <div className="relative">
          <button 
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="w-full bg-dark-800 hover:bg-dark-700/80 transition-all duration-200 rounded-2xl p-4 flex items-center gap-3 text-left border border-dark-700/30 group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-500 font-bold flex items-center justify-center text-sm shadow-inner group-hover:scale-105 transition-transform duration-200">
              {currentUser.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white truncate">{currentUser.nombre}</h4>
              <p className="text-xs text-slate-400 truncate">{currentUser.rol} {currentUser.cargo ? `• ${currentUser.cargo}` : ''}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Switch User Dropdown */}
          {showUserDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-dark-700 rounded-2xl shadow-xl z-50 py-2 max-h-60 overflow-y-auto animate-fadeIn">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Cambiar de Usuario (Simulado)
              </div>
              {users.filter(u => u.activo).map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    loginAsUser(u.id);
                    setShowUserDropdown(false);
                    if (setSelectedEmployeeId) setSelectedEmployeeId('todos');
                    // Automatically redirect to suitable dashboard
                    if (u.rol === 'Administrador') {
                      setCurrentTab('admin-dashboard');
                    } else {
                      setCurrentTab('resumen');
                    }
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-dark-700 transition-colors flex items-center gap-3 ${u.id === currentUser.id ? 'bg-dark-700/50 text-white font-medium' : 'text-slate-300'}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-dark-600 text-xs font-bold flex items-center justify-center text-slate-300">
                    {u.avatar}
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{u.nombre}</div>
                    <div className="text-[10px] text-slate-400">{u.rol}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Menú principal
        </div>
        {activeMenu.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive 
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/10' 
                  : 'hover:bg-dark-800/80 hover:text-white text-slate-400'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-dark-800">
        <button 
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl text-sm font-medium transition-colors duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  History,
  Users,
  LogOut,
  ShieldAlert,
  LayoutDashboard,
  Coffee
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, setSelectedEmployeeId }) {
  const { currentUser, signOut } = useApp();

  const employeeMenu = [
    { id: 'resumen', label: 'Resumen', icon: Clock },
    { id: 'historial', label: 'Historial', icon: History }
  ];

  const adminMenu = [
    { id: 'admin-dashboard', label: 'Tablero Real', icon: LayoutDashboard },
    { id: 'admin-historial', label: 'Historial Global', icon: History },
    { id: 'admin-usuarios', label: 'Gestion Usuarios', icon: Users },
    { id: 'admin-motivos', label: 'Motivos de Pausa', icon: Coffee },
    { id: 'admin-auditoria', label: 'Log de Auditoria', icon: ShieldAlert }
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
      <div className="p-6 border-b border-dark-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-600/20">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-tight">Control Horario</h1>
          <p className="text-xs text-slate-500">Registro de jornada</p>
        </div>
      </div>

      <div className="p-4 border-b border-dark-800">
        <div className="w-full bg-dark-800 rounded-2xl p-4 flex items-center gap-3 text-left border border-dark-700/30">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-500 font-bold flex items-center justify-center text-sm shadow-inner">
            {currentUser.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{currentUser.nombre}</h4>
            <p className="text-xs text-slate-400 truncate">{currentUser.rol} {currentUser.cargo ? `- ${currentUser.cargo}` : ''}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Menu principal
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

      <div className="p-4 border-t border-dark-800">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl text-sm font-medium transition-colors duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar sesion</span>
        </button>
      </div>
    </aside>
  );
}

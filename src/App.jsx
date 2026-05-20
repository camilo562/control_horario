import React, { useState, useEffect, Component } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import EmpleadoDashboard from './pages/EmpleadoDashboard';
import EmpleadoHistorial from './pages/EmpleadoHistorial';
import AdminDashboard from './pages/AdminDashboard';
import AdminHistorial from './pages/AdminHistorial';
import AdminUsuarios from './pages/AdminUsuarios';
import AdminMotivos from './pages/AdminMotivos';
import AdminAuditoria from './pages/AdminAuditoria';
import AuthPage from './pages/AuthPage';

// --- SAMMERS-JEANS: ERROR BOUNDARY COMPONENT (Rule 4.5) ---
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-950 text-slate-100 flex items-center justify-center p-6">
          <div className="bg-dark-900 border border-red-500/20 max-w-lg w-full rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto text-2xl font-bold animate-bounce">
              ⚠️
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Se produjo un error crítico</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                El sistema de control horario de SAMMERS-JEANS capturó un fallo inesperado. Por favor recarga el navegador o reporta el incidente a soporte técnico.
              </p>
            </div>
            <div className="p-4 bg-dark-850 rounded-xl border border-dark-800 text-[11px] text-red-400 font-mono text-left max-h-40 overflow-y-auto">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/10 transition-colors"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inner Content Switcher Component
function MainLayout() {
  const { currentUser, loading } = useApp();
  
  // Tab Routing: defaults to 'resumen' for Empleado and 'admin-dashboard' for Admin (safely checked with optional chaining)
  const [currentTab, setCurrentTab] = useState(() => {
    return currentUser?.rol === 'Administrador' ? 'admin-dashboard' : 'resumen';
  });

  // State to pass target user audit id from Admin Dashboard to Admin Historial
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('todos');

  // Reset filter when user changes (e.g. simulating user switch)
  useEffect(() => {
    setSelectedEmployeeId('todos');
  }, [currentUser]);

  // RBAC checks for routing protection (RF-19)
  React.useEffect(() => {
    if (!currentUser) return;
    if (currentUser.rol === 'Empleado' && currentTab.startsWith('admin-')) {
      setCurrentTab('resumen');
    }
    if (currentUser.rol === 'Administrador' && !currentTab.startsWith('admin-')) {
      setCurrentTab('admin-dashboard');
    }
  }, [currentUser, currentTab]);

  // Visual skeleton loader check during asynchronous DB sync (Rule 4.3)
  if (loading) {
    return (
      <div className="flex h-screen w-screen bg-dark-950 items-center justify-center">
        <div className="space-y-6 text-center max-w-sm w-full p-6">
          <div className="w-12 h-12 rounded-full border-4 border-brand-500/20 border-t-brand-500 animate-spin mx-auto shadow-lg shadow-brand-500/10"></div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-white tracking-wider uppercase">Sammers Jeans</h3>
            <p className="text-[11px] text-slate-400">Estableciendo conexión de seguridad con Supabase...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render glowing Auth Login/Register page if not authenticated
  if (!currentUser) {
    return <AuthPage />;
  }

  const renderActiveView = () => {
    switch (currentTab) {
      case 'resumen':
        return <EmpleadoDashboard />;
      case 'historial':
        return <EmpleadoHistorial />;
      case 'admin-dashboard':
        return (
          <AdminDashboard 
            setCurrentTab={setCurrentTab} 
            setSelectedEmployeeForAudit={setSelectedEmployeeId} 
          />
        );
      case 'admin-historial':
        return (
          <AdminHistorial 
            selectedEmployeeId={selectedEmployeeId} 
            setSelectedEmployeeId={setSelectedEmployeeId} 
          />
        );
      case 'admin-usuarios':
        return <AdminUsuarios />;
      case 'admin-motivos':
        return <AdminMotivos />;
      case 'admin-auditoria':
        return <AdminAuditoria />;
      default:
        return <EmpleadoDashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dark-950 text-slate-100 font-sans">
      {/* Left Sidebar Layout */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        setSelectedEmployeeId={setSelectedEmployeeId} 
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-dark-950">
        
        {/* Top Navbar Header */}
        <Header currentTab={currentTab} />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}

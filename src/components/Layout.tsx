import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Package, ArrowLeftRight, Truck, Store, LogOut, Menu, X, Users } from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, activePage, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['superadmin', 'admin'] },
    { id: 'stores', label: 'Lojas', icon: Store, roles: ['superadmin'] },
    { id: 'products', label: 'Produtos', icon: Package, roles: ['superadmin', 'admin'] },
    { id: 'movements', label: 'Estoque', icon: ArrowLeftRight, roles: ['superadmin', 'admin'] },
    { id: 'requests', label: 'Solicitações', icon: Package, roles: ['superadmin', 'admin'] },
    { id: 'shipments', label: 'Remessas', icon: Truck, roles: ['superadmin'] },
    { id: 'users', label: 'Usuários', icon: Users, roles: ['superadmin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Comércio Pro</h1>
            <p className="text-xs text-slate-400 mt-1">Gestão Inteligente</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activePage === item.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 mb-4 px-2 cursor-pointer hover:bg-slate-800 p-2 rounded-lg transition-colors" onClick={() => onNavigate('profile')}>
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">
                {user?.role === 'superadmin' ? 'Super Admin' : user?.store_name || 'Admin'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center space-x-2 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Menu size={24} />
            </button>
            <span className="font-semibold text-gray-700">Comércio Pro</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>

        <footer className="bg-white border-t border-gray-200 p-4 text-center text-sm text-gray-500">
          Sistema desenvolvido por D22
        </footer>
      </div>
    </div>
  );
}

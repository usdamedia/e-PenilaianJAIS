import React from 'react';
import { LayoutDashboard, FileText, Users, Settings as SettingsIcon, LogOut, Shield } from 'lucide-react';

export type AdminView = 'dashboard' | 'settings' | 'records' | 'users' | 'comments';

interface AdminSidebarProps {
  currentView: AdminView;
  onViewChange: (view: AdminView) => void;
  onLogout: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm group ${
      active
        ? 'bg-lime-400 text-dark shadow-glow'
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className="tracking-wide">{label}</span>
  </button>
);

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentView,
  onViewChange,
  onLogout,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) => {
  return (
    <>
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[280px] bg-[#1A1C1E] text-white transform transition-transform duration-300 lg:translate-x-0 lg:static lg:block
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center gap-4 mb-12 mt-2">
            <div className="w-12 h-12 bg-lime-400 rounded-2xl flex items-center justify-center text-dark shadow-glow">
              <Shield size={24} strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-black text-2xl tracking-tight block leading-none">JAIS</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">Admin Panel</span>
            </div>
          </div>

          <nav className="flex-1 space-y-3">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Analisis Data" 
              active={currentView === 'dashboard'} 
              onClick={() => onViewChange('dashboard')}
            />
            <NavItem 
              icon={<FileText size={20} />} 
              label="Rekod Penilaian" 
              active={currentView === 'records'}
              onClick={() => onViewChange('dashboard')} 
            />
            <NavItem 
              icon={<Users size={20} />} 
              label="Akses Pengguna" 
              active={currentView === 'users'}
              onClick={() => onViewChange('dashboard')} 
            />
            <NavItem 
              icon={<FileText size={20} />} 
              label="Komen & Cadangan" 
              active={currentView === 'comments'}
              onClick={() => onViewChange('comments')} 
            />
            <NavItem 
              icon={<SettingsIcon size={20} />} 
              label="Konfigurasi" 
              active={currentView === 'settings'}
              onClick={() => onViewChange('settings')}
            />
          </nav>

          <div className="pt-8 border-t border-gray-800">
            <button 
              onClick={onLogout}
              className="flex items-center gap-3 px-6 py-4 text-red-400 hover:bg-white/5 rounded-2xl transition-all w-full text-sm font-bold group"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              Log Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
    </>
  );
};

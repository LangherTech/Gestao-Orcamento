import React from 'react';
import { RefreshCw, Building, Bell, UserCircle2, LogOut, Menu } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function Header({ obras, selectedObraId, setSelectedObraId, onRefresh, isRefreshing, user, onToggleSidebar }) {
  const getProfileInfo = () => {
    if (!user) return { name: 'Usuário', initials: 'U', role: 'Visitante' };
    
    if (user.email === 'guilherme@solucoesedifica.com.br') {
      return { name: 'Guilherme Langher', initials: 'GL', role: 'Administrador' };
    }
    if (user.email === 'marcio@solucoesedifica.com.br') {
      return { name: 'Marcio', initials: 'M', role: 'Administrador' };
    }
    
    const parts = user.email.split('@')[0].split(/[._-]/);
    const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    const initials = parts.slice(0, 2).map(p => p[0].toUpperCase()).join('');
    return { name, initials, role: 'Usuário do Sistema' };
  };

  const profile = getProfileInfo();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  return (
    <header className="h-16 glass-panel border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between shrink-0 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        {/* Menu Button (Mobile Only) */}
        <button 
          onClick={onToggleSidebar}
          className="p-1.5 md:hidden text-slate-300 hover:text-white bg-slate-800/50 rounded-lg shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Obra Selector */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Building className="w-5 h-5 text-emerald-400 hidden sm:block shrink-0" />
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider hidden sm:inline shrink-0">Obra Ativa:</span>
        <select
          value={selectedObraId || ''}
          onChange={(e) => setSelectedObraId(e.target.value || null)}
          className="bg-slate-800/80 border border-slate-700/80 text-white text-sm rounded-xl px-2 sm:px-3.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium cursor-pointer truncate w-full"
        >
          <option value="">🏢 Todas as Obras</option>
          {obras.map((obra) => (
            <option key={obra.id} value={obra.id}>
              {obra.nome}
            </option>
          ))}
        </select>
        </div>
      </div>

      {/* Actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Atualizar dados do sistema (auto-refresh a cada 5 min)"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">Atualizar</span>
        </button>

        {/* Separator */}
        <div className="h-5 w-px bg-slate-800"></div>

        {/* User Profile */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 text-xs font-bold">
            {profile.initials}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-200 leading-none">{profile.name}</p>
            <span className="text-[10px] text-slate-400">{profile.role}</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Sair do sistema"
          className="p-2 text-slate-400 hover:text-red-400 transition-colors ml-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

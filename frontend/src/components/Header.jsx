import React from 'react';
import { RefreshCw, Building, Bell, UserCircle2 } from 'lucide-react';

export default function Header({ obras, selectedObraId, setSelectedObraId, onRefresh, isRefreshing }) {
  return (
    <header className="h-16 glass-panel border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      {/* Obra Selector */}
      <div className="flex items-center gap-3">
        <Building className="w-5 h-5 text-emerald-400" />
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider hidden sm:inline">Obra Ativa:</span>
        <select
          value={selectedObraId || ''}
          onChange={(e) => setSelectedObraId(e.target.value || null)}
          className="bg-slate-800/80 border border-slate-700/80 text-white text-sm rounded-xl px-3.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium cursor-pointer"
        >
          <option value="">🏢 Todas as Obras (Visão Consolidada)</option>
          {obras.map((obra) => (
            <option key={obra.id} value={obra.id}>
              {obra.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Actions & Profile */}
      <div className="flex items-center gap-4">
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
            GL
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-200 leading-none">Guilherme Langher</p>
            <span className="text-[10px] text-slate-400">Edifica Soluções</span>
          </div>
        </div>
      </div>
    </header>
  );
}

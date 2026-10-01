import React from 'react';
import {
  LayoutDashboard,
  Building2,
  FileSpreadsheet,
  CalendarDays,
  ClipboardList,
  ShoppingCart,
  HardHat,
  Users2,
  DollarSign,
  FileText,
  ChevronRight
} from 'lucide-react';

export const navigationItems = [
  { id: 'dashboard', label: 'Dashboards', icon: LayoutDashboard },
  { id: 'obras', label: 'Obras', icon: Building2 },
  { id: 'servicos', label: 'Serviços & Orçamento', icon: FileSpreadsheet },
  { id: 'cronograma', label: 'Cronograma', icon: CalendarDays },
  { id: 'rdo', label: 'Diário de Obra (RDO)', icon: ClipboardList },
  { id: 'compras', label: 'Compras & Insumos', icon: ShoppingCart },
  { id: 'gestao', label: 'Empreiteiros', icon: HardHat },
  { id: 'calendario', label: 'Equipe & Calendário', icon: Users2 },
  { id: 'financeiro', label: 'Financeiro & Caixa', icon: DollarSign },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="w-64 glass-panel border-r border-slate-800 flex flex-col justify-between shrink-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight tracking-tight">Edifica</h1>
              <span className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase">Soluções em Obras</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Módulos do Sistema
          </div>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/20 text-xs text-slate-400">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-slate-300">Ambiente Online</span>
        </div>
        <p className="text-[11px] text-slate-400">Edifica v1.0 • Supabase Auth</p>
      </div>
    </aside>
  );
}

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
  // 1. Pré-obra / Visitas
  { id: 'visitas', label: 'Visitas & Prospecção', icon: Building2 },
  // 2. Orçamento
  { id: 'servicos', label: 'Serviços & Orçamento', icon: FileSpreadsheet },
  // 3. Gestão / Acompanhamento macro
  { id: 'obras', label: 'Obras', icon: Building2 },
  { id: 'dashboard', label: 'Dashboards', icon: LayoutDashboard },
  { id: 'financeiro', label: 'Financeiro & Caixa', icon: DollarSign },
  // 4. Execução de campo
  { id: 'cronograma', label: 'Cronograma', icon: CalendarDays },
  { id: 'compras', label: 'Compras & Insumos', icon: ShoppingCart },
  { id: 'gestao', label: 'Terceiros', icon: HardHat },
  { id: 'rdo', label: 'Diário de Obra (RDO)', icon: ClipboardList },
  { id: 'calendario', label: 'Equipe & Calendário', icon: Users2 },
];

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }) {
  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar - fixed and translating on mobile, static on desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 glass-panel border-r border-slate-800 flex flex-col justify-between transform transition-transform duration-300 md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-center px-4 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
            <img
              src="https://res.cloudinary.com/doaewgeqp/image/upload/v1773234514/Design_sem_nome_2_rhfw6s.png"
              alt="Edifica"
              className="h-9 w-auto object-contain"
            />
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Módulos do Sistema
            </div>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if(setIsOpen) setIsOpen(false); // Fecha o menu no mobile ao clicar
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mb-1 ${
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

          {/* Footer info */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/20 text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium text-slate-300">Ambiente Online</span>
            </div>
            <p className="text-[11px] text-slate-400">Edifica v1.0 • Supabase Auth</p>
          </div>
        </div>
      </aside>
    </>
  );
}

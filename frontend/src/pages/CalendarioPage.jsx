import React from 'react';
import { Users2, Plus, Calendar, Clock, HardHat } from 'lucide-react';

export default function CalendarioPage() {
  const funcionarios = [
    { id: '1', nome: 'Carlos Mendes', cargo: 'Mestre de Obras', obra: 'Residência Alphaville', periodo: 'Dia Inteiro' },
    { id: '2', nome: 'João Silva', cargo: 'Gesseiro / Drywall', obra: 'Residência Alphaville', periodo: 'Manhã' },
    { id: '3', nome: 'João Silva', cargo: 'Gesseiro / Drywall', obra: 'Reforma Comercial Prime Tower', periodo: 'Tarde' },
    { id: '4', nome: 'Antônio Prado', cargo: 'Ajudante Geral', obra: 'Residência Alphaville', periodo: 'Dia Inteiro' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Equipe & Alocações no Calendário</h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestão de colaboradores próprios (CLT) e alocações por obra com divisão por turnos (manhã/tarde/dia inteiro).
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>Alocar Colaborador</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {funcionarios.map((f, i) => (
          <div key={i} className="glass-card p-5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
                {f.nome.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{f.nome}</h4>
                <p className="text-xs text-slate-400">{f.cargo}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-emerald-400 block">{f.obra}</span>
              <span className="text-[11px] text-slate-400 font-medium">Turno: {f.periodo}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

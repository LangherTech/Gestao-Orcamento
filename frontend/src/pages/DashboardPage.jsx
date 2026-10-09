import React from 'react';
import { DollarSign, TrendingUp, Wallet, CheckCircle2, ArrowUpRight, ArrowDownRight, Building } from 'lucide-react';

export default function DashboardPage({ selectedObra, kpis, lucratividadeObras, orcadoVsRealizado = [] }) {
  const formatMoney = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {selectedObra ? `Dashboard: ${selectedObra.nome}` : 'Visão Geral Consolidada'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {selectedObra 
              ? `Cliente: ${selectedObra.cliente || 'Não informado'} • Orçamento Aprovado: ${formatMoney(selectedObra.valor_aprovado)}`
              : 'Consolidação de indicadores financeiros e operacionais de todas as obras ativas.'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          Dados atualizados a cada 5 minutos
        </div>
      </div>

      {/* 4 KPI Cards (Conforme especificado no Notion) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Receita Total */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Receita Prevista</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatMoney(kpis?.receita_total)}
          </div>
          <div className="mt-2 flex items-center text-xs text-emerald-400 gap-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Faturamento contratado</span>
          </div>
        </div>

        {/* Card 2: Despesas Totais */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Despesas Realizadas</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatMoney(kpis?.despesas_totais)}
          </div>
          <div className="mt-2 flex items-center text-xs text-amber-400 gap-1 font-medium">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Compras + Empreiteiros + Caixa + Funcionários</span>
          </div>
        </div>

        {/* Card 3: Lucro Projetado */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Lucro Líquido Previsto</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {formatMoney(kpis?.lucro_projetado)}
          </div>
          <div className="mt-2 flex items-center text-xs text-emerald-300 gap-1 font-medium">
            <span>Margem estimada: {kpis?.margem_media_pct}%</span>
          </div>
        </div>

        {/* Card 4: Progresso Físico */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Progresso Médio</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {kpis?.percentual_geral_conclusao}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${kpis?.percentual_geral_conclusao || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Gráficos e Seções Comparativas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Lucratividade por Obra */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-base font-semibold text-white mb-1">Lucratividade por Obra</h3>
          <p className="text-xs text-slate-400 mb-6">Comparação de margem de lucro percentual entre obras ativas</p>

          <div className="space-y-4">
            {lucratividadeObras.map((item, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {item.obra_nome}
                  </span>
                  <span className="font-bold text-emerald-400">{item.margem_pct}% margem</span>
                </div>
                <div className="w-full bg-slate-800/80 h-3 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-700" 
                    style={{ width: `${Math.min(item.margem_pct, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Receita: {formatMoney(item.receita)}</span>
                  <span>Lucro: {formatMoney(item.lucro)}</span>
                </div>
              </div>
            ))}
            {lucratividadeObras.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/60 border-dashed">
                Nenhuma obra ativa cadastrada no momento.
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Orçado vs. Realizado */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-base font-semibold text-white mb-1">Orçado vs. Realizado por Categoria</h3>
          <p className="text-xs text-slate-400 mb-6">Controle de estouros de verba e custos acumulados</p>

          <div className="space-y-5">
            {orcadoVsRealizado.map((item) => (
              <div key={item.id || item.categoria}>
                <div className="flex justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium">{item.categoria}</span>
                    {item.excedeu && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-semibold">
                        Estouro de verba
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400">
                    {formatMoney(item.realizado)} / {formatMoney(item.orcado)} orçados ({item.pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${item.excedeu ? 'bg-red-500' : (item.cor || 'bg-blue-500')}`} 
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {orcadoVsRealizado.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-500">
                Nenhum dado orçamentário disponível.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

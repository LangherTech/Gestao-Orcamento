import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, ArrowUpRight, ArrowDownRight, Check, AlertCircle, RefreshCw, X, TrendingUp, TrendingDown, Clock, CreditCard } from 'lucide-react';
import api from '../services/api';

export default function FinanceiroPage({ selectedObraId, obras }) {
  const [activeTab, setActiveTab] = useState('resumo');
  const [fluxo, setFluxo] = useState(null);
  const [receitas, setReceitas] = useState([]);
  const [caixaPequeno, setCaixaPequeno] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isReceitaModalOpen, setIsReceitaModalOpen] = useState(false);
  const [isCaixaModalOpen, setIsCaixaModalOpen] = useState(false);
  
  // Forms state
  const [formReceita, setFormReceita] = useState({ descricao: '', valor: '', data_receita: '', status: 'pendente' });
  const [formCaixa, setFormCaixa] = useState({ descricao: '', valor: '', data: '', categoria: 'Material' });

  const formatMoney = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR').format(date);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const queryParam = selectedObraId ? `?obra_id=${selectedObraId}` : '';
      const [fluxoRes, receitasRes, caixaRes] = await Promise.all([
        api.get(`/financeiro/fluxo${queryParam}`),
        api.get(`/financeiro/receitas${queryParam}`),
        api.get(`/financeiro/caixa-pequeno${queryParam}`)
      ]);
      setFluxo(fluxoRes.data);
      setReceitas(receitasRes.data);
      setCaixaPequeno(caixaRes.data);
    } catch (error) {
      console.error("Erro ao buscar dados financeiros:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedObraId]);

  const handleCreateReceita = async (e) => {
    e.preventDefault();
    if (!selectedObraId) return alert('Selecione uma obra primeiro.');
    try {
      await api.post('/financeiro/receitas', {
        obra_id: selectedObraId,
        descricao: formReceita.descricao,
        valor: parseFloat(formReceita.valor),
        data_receita: formReceita.data_receita,
        status: formReceita.status
      });
      setIsReceitaModalOpen(false);
      setFormReceita({ descricao: '', valor: '', data_receita: '', status: 'pendente' });
      fetchData();
    } catch (error) {
      console.error("Erro ao criar receita:", error);
      alert('Erro ao lançar recebimento.');
    }
  };

  const handleCreateCaixa = async (e) => {
    e.preventDefault();
    if (!selectedObraId) return alert('Selecione uma obra primeiro.');
    try {
      await api.post('/financeiro/caixa-pequeno', {
        obra_id: selectedObraId,
        descricao: formCaixa.descricao,
        valor: parseFloat(formCaixa.valor),
        data: formCaixa.data,
        categoria: formCaixa.categoria,
        status: 'pendente_aprovacao'
      });
      setIsCaixaModalOpen(false);
      setFormCaixa({ descricao: '', valor: '', data: '', categoria: 'Material' });
      fetchData();
    } catch (error) {
      console.error("Erro ao criar despesa:", error);
      alert('Erro ao lançar despesa.');
    }
  };

  const handleApproveCaixa = async (id) => {
    try {
      await api.put(`/financeiro/caixa-pequeno/${id}?status=aprovado`);
      fetchData();
    } catch (error) {
      console.error("Erro ao aprovar despesa:", error);
      alert('Erro ao aprovar despesa.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Financeiro & Fluxo de Caixa</h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestão de receitas, despesas e aprovação de gastos do canteiro.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
          <button 
            onClick={() => setIsReceitaModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Receita</span>
          </button>
          <button 
            onClick={() => setIsCaixaModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Despesa</span>
          </button>
        </div>
      </div>

      {!selectedObraId && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Selecione uma obra no topo da página para ver dados específicos, ou os dados exibidos serão consolidados de todas as obras (lançamentos desabilitados).</span>
        </div>
      )}

      {/* Navegação por Abas */}
      <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-slate-800/60 w-fit">
        {['resumo', 'receitas', 'caixapequeno'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {tab === 'resumo' && 'Resumo & Fluxo'}
            {tab === 'receitas' && 'Receitas & Faturamento'}
            {tab === 'caixapequeno' && 'Caixa Pequeno'}
          </button>
        ))}
      </div>

      {/* CONTEÚDO DAS ABAS */}
      
      {activeTab === 'resumo' && fluxo && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-sky-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-400">Receita Prevista (Orçado)</span>
                <DollarSign className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-bold text-white">{formatMoney(fluxo.receita_prevista)}</div>
            </div>
            
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-400">Receita Realizada</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">{formatMoney(fluxo.receita_recebida)}</div>
            </div>
            
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-400">Despesas Realizadas</span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-rose-400">{formatMoney(fluxo.despesa_total)}</div>
            </div>
            
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-indigo-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-400">Saldo Operacional</span>
                <CreditCard className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white">{formatMoney(fluxo.saldo_operacional)}</div>
              <p className="text-xs text-indigo-400 mt-2 font-medium">Margem: {fluxo.margem_atual_pct}%</p>
            </div>
          </div>
          
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Composição de Despesas</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300">Caixa Pequeno (Aprovado)</span>
                <span className="font-semibold text-white">{formatMoney(fluxo.despesa_caixa_pequeno)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300">Empreiteiros & Contratos</span>
                <span className="font-semibold text-white">{formatMoney(fluxo.despesa_empreiteiros)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300">Pedidos de Compra</span>
                <span className="font-semibold text-white">{formatMoney(fluxo.despesa_compras)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'receitas' && (
        <div className="glass-card p-6 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Receitas e Faturamentos</h3>
              <p className="text-xs text-slate-400">Histórico de recebimentos do projeto</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-lg">Data</th>
                  <th className="px-4 py-3 font-semibold">Descrição</th>
                  <th className="px-4 py-3 font-semibold text-right">Valor</th>
                  <th className="px-4 py-3 font-semibold text-center rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 border-t border-slate-800">
                {receitas.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-slate-500">Nenhuma receita registrada.</td>
                  </tr>
                ) : (
                  receitas.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-300">{formatDate(r.data_receita)}</td>
                      <td className="px-4 py-3 text-white font-medium">{r.descricao}</td>
                      <td className="px-4 py-3 text-emerald-400 font-semibold text-right">{formatMoney(r.valor)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          r.status === 'recebido' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'caixapequeno' && (
        <div className="glass-card p-6 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Despesas de Caixa Pequeno (Canteiro)</h3>
              <p className="text-xs text-slate-400">Gastos do dia a dia sujeitos à aprovação</p>
            </div>
            {caixaPequeno.filter(c => c.status === 'pendente_aprovacao').length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                {caixaPequeno.filter(c => c.status === 'pendente_aprovacao').length} Pendente(s)
              </span>
            )}
          </div>

          <div className="space-y-3">
            {caixaPequeno.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                Nenhuma despesa de caixa pequeno registrada.
              </div>
            ) : (
              caixaPequeno.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {item.categoria}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(item.data)} • Solicitante: {item.solicitante || 'Desconhecido'}</span>
                    </div>
                    <p className="text-sm font-semibold text-white">{item.descricao}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-base font-bold text-white">
                      {formatMoney(item.valor)}
                    </span>
                    {item.status === 'pendente_aprovacao' ? (
                      <button 
                        onClick={() => handleApproveCaixa(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprovar</span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Aprovado
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Nova Receita */}
      {isReceitaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Lançar Receita</h3>
              <button onClick={() => setIsReceitaModalOpen(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateReceita} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Descrição</label>
                <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-colors" placeholder="Ex: Parcela 01 - Assinatura do Contrato" value={formReceita.descricao} onChange={e => setFormReceita({...formReceita, descricao: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Valor (R$)</label>
                  <input required type="number" step="0.01" min="0.01" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-colors" placeholder="0.00" value={formReceita.valor} onChange={e => setFormReceita({...formReceita, valor: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Data</label>
                  <input required type="date" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]" value={formReceita.data_receita} onChange={e => setFormReceita({...formReceita, data_receita: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-colors" value={formReceita.status} onChange={e => setFormReceita({...formReceita, status: e.target.value})}>
                  <option value="pendente">Pendente</option>
                  <option value="recebido">Recebido</option>
                </select>
              </div>
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setIsReceitaModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer">Salvar Receita</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Caixa Pequeno */}
      {isCaixaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Lançar Despesa de Caixa Pequeno</h3>
              <button onClick={() => setIsCaixaModalOpen(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCaixa} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Descrição</label>
                <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-rose-500 transition-colors" placeholder="Ex: Materiais urgentes (Lixa, Fita)" value={formCaixa.descricao} onChange={e => setFormCaixa({...formCaixa, descricao: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Valor (R$)</label>
                  <input required type="number" step="0.01" min="0.01" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-rose-500 transition-colors" placeholder="0.00" value={formCaixa.valor} onChange={e => setFormCaixa({...formCaixa, valor: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Data</label>
                  <input required type="date" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-rose-500 transition-colors [color-scheme:dark]" value={formCaixa.data} onChange={e => setFormCaixa({...formCaixa, data: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Categoria</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-rose-500 transition-colors" value={formCaixa.categoria} onChange={e => setFormCaixa({...formCaixa, categoria: e.target.value})}>
                  <option value="Material">Material</option>
                  <option value="Frete">Frete</option>
                  <option value="Alimentação">Alimentação</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setIsCaixaModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-semibold shadow-lg shadow-rose-500/20 transition-colors cursor-pointer">Salvar Despesa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

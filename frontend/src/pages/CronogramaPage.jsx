import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, CheckCircle, AlertCircle, RefreshCw, X, Edit, ListChecks, Trash2 } from 'lucide-react';
import api from '../services/api';

export default function CronogramaPage({ selectedObraId }) {
  const [etapas, setEtapas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for the new etapa form
  const [formEtapa, setFormEtapa] = useState({
    nome: '',
    data_prevista_inicio: '',
    data_prevista_fim: '',
    custo_previsto: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const queryParam = selectedObraId ? `?obra_id=${selectedObraId}` : '';
      const res = await api.get(`/cronograma/etapas${queryParam}`);
      setEtapas(res.data || []);
    } catch (error) {
      console.error("Erro ao carregar etapas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedObraId]);

  const handleCreateEtapa = async (e) => {
    e.preventDefault();
    if (!selectedObraId) return alert('Selecione uma obra primeiro.');
    try {
      await api.post('/cronograma/etapas', {
        obra_id: selectedObraId,
        nome: formEtapa.nome,
        data_prevista_inicio: formEtapa.data_prevista_inicio || null,
        data_prevista_fim: formEtapa.data_prevista_fim || null,
        custo_previsto: parseFloat(formEtapa.custo_previsto) || 0,
        custo_real: 0,
        percentual_conclusao: 0
      });
      setIsModalOpen(false);
      setFormEtapa({ nome: '', data_prevista_inicio: '', data_prevista_fim: '', custo_previsto: '' });
      fetchData();
    } catch (error) {
      console.error("Erro ao criar etapa:", error);
      const detail = error.response?.data?.detail || 'Erro ao criar a etapa.';
      alert(detail);
    }
  };

  const handleDeleteEtapa = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir a etapa "${nome}"?`)) return;
    try {
      await api.delete(`/cronograma/etapas/${id}`);
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir etapa:", error);
      alert(error.response?.data?.detail || "Erro ao excluir a etapa.");
    }
  };

  const updateProgresso = async (id, progresso) => {
    try {
      await api.put(`/cronograma/etapas/${id}`, {
        percentual_conclusao: parseFloat(progresso)
      });
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar progresso:", error);
      alert("Falha ao atualizar avanço da etapa.");
    }
  };

  const formatMoney = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Não definida';
    const date = new Date(dateString);
    // adjust for timezone issues if needed, simple slice works for YYYY-MM-DD
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const getStatus = (progresso) => {
    if (progresso >= 100) return { label: 'Concluído', class: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
    if (progresso > 0) return { label: 'Em Andamento', class: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' };
    return { label: 'A Iniciar', class: 'bg-slate-800 text-slate-400 border border-slate-700' };
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Cronograma Físico-Financeiro</h2>
          <p className="text-sm text-slate-400 mt-1">
            Controle de etapas, linha do tempo, avanço físico e custo de execução.
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
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Etapa</span>
          </button>
        </div>
      </div>

      {!selectedObraId && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Selecione uma obra no topo para ver o cronograma ou adicionar novas etapas.</span>
        </div>
      )}

      <div className="space-y-4">
        {etapas.length === 0 && !isLoading && (
          <div className="p-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
            Nenhuma etapa registrada para esta obra.
          </div>
        )}

        {etapas.map((etapa) => {
          const status = getStatus(etapa.percentual_conclusao);
          return (
            <div key={etapa.id} className="glass-card p-5 rounded-2xl hover:border-slate-700/80 transition-colors group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${status.class}`}>
                      {status.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      Prazo: {formatDate(etapa.data_prevista_inicio)} até {formatDate(etapa.data_prevista_fim)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{etapa.nome}</h3>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Custo Previsto vs Real</span>
                    <span className="font-semibold text-slate-200">
                      {formatMoney(etapa.custo_real)} / {formatMoney(etapa.custo_previsto)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteEtapa(etapa.id, etapa.nome)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Excluir Etapa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2 mt-4">
                <div className="flex justify-between items-end text-xs text-slate-400">
                  <span className="flex gap-2">Avanço Físico 
                    <span className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                       (Atualizar ➔)
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="0" max="100" 
                      className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right text-white focus:border-emerald-500 outline-none"
                      defaultValue={etapa.percentual_conclusao}
                      onBlur={(e) => {
                        if (e.target.value !== String(etapa.percentual_conclusao)) {
                           updateProgresso(etapa.id, e.target.value);
                        }
                      }}
                    />
                    <span className="font-bold text-white">%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      etapa.percentual_conclusao >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${etapa.percentual_conclusao}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nova Etapa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Adicionar Etapa</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEtapa} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome da Etapa</label>
                <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-colors" placeholder="Ex: Fundações e Alicerce" value={formEtapa.nome} onChange={e => setFormEtapa({...formEtapa, nome: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Início Previsto</label>
                  <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]" value={formEtapa.data_prevista_inicio} onChange={e => setFormEtapa({...formEtapa, data_prevista_inicio: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Fim Previsto</label>
                  <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]" value={formEtapa.data_prevista_fim} onChange={e => setFormEtapa({...formEtapa, data_prevista_fim: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Custo Previsto (R$)</label>
                <input type="number" step="0.01" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-colors" placeholder="0.00" value={formEtapa.custo_previsto} onChange={e => setFormEtapa({...formEtapa, custo_previsto: e.target.value})} />
              </div>
              
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer">Salvar Etapa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

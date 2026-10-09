import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, CheckCircle, AlertCircle, RefreshCw, X, Edit, ListChecks, Trash2, Printer } from 'lucide-react';
import api from '../services/api';
import { exportCronogramaPDF, exportCronogramaTabelaPDF } from '../components/CronogramaPDF';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function CronogramaPage({ selectedObraId, selectedObra, obras = [] }) {
  const [etapas, setEtapas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [obraInfo, setObraInfo] = useState(null);
  const [deletingEtapa, setDeletingEtapa] = useState(null);

  useEffect(() => {
    if (selectedObra) {
      setObraInfo(selectedObra);
    } else if (obras && obras.length > 0 && selectedObraId) {
      const found = obras.find(o => o.id === selectedObraId);
      if (found) setObraInfo(found);
    } else if (selectedObraId) {
      api.get('/obras?arquivada=all')
        .then(res => {
          if (res.data && Array.isArray(res.data)) {
            const found = res.data.find(o => o.id === selectedObraId);
            if (found) setObraInfo(found);
          }
        })
        .catch(err => console.error("Erro ao carregar dados da obra:", err));
    }
  }, [selectedObra, obras, selectedObraId]);

  const currentObra = selectedObra || obraInfo || (obras && obras.find(o => o.id === selectedObraId)) || null;
  const currentObraNome = currentObra?.nome || (selectedObraId ? 'Obra' : 'Geral');
  const currentClienteNome = currentObra?.cliente || '';
  
  // State for the new etapa form
  const [formEtapa, setFormEtapa] = useState({
    nome: '',
    data_prevista_inicio: '',
    data_prevista_fim: '',
    etapa_pai_id: null
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
        etapa_pai_id: formEtapa.etapa_pai_id || null
      });
      setIsModalOpen(false);
      setFormEtapa({ nome: '', data_prevista_inicio: '', data_prevista_fim: '', etapa_pai_id: null });
      fetchData();
    } catch (error) {
      console.error("Erro ao criar etapa:", error);
      const detail = error.response?.data?.detail || 'Erro ao criar a etapa.';
      alert(detail);
    }
  };

  const handleDeleteEtapa = (id, nome) => {
    setDeletingEtapa({ id, nome });
  };

  const handleConfirmDelete = async () => {
    if (!deletingEtapa) return;
    try {
      await api.delete(`/cronograma/etapas/${deletingEtapa.id}`);
      setDeletingEtapa(null);
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir etapa:", error);
      alert(error.response?.data?.detail || "Erro ao excluir a etapa.");
    }
  };

  const handleToggleEtapaStatus = async (id, isStart, isFinish) => {
    try {
      const data = {};
      const now = new Date().toISOString().split('T')[0];
      if (isStart) data.data_real_inicio = now;
      if (isFinish) data.data_real_fim = now;
      
      await api.put(`/cronograma/etapas/${id}`, data);
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar etapa:", error);
      alert(error.response?.data?.detail || "Falha ao atualizar o status da etapa.");
    }
  };

  const handleReabrirEtapa = async (id) => {
    try {
      await api.put(`/cronograma/etapas/${id}`, { data_real_fim: null });
      fetchData();
    } catch (error) {
      console.error("Erro ao reabrir etapa:", error);
      alert("Falha ao reabrir a etapa.");
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

  const getStatus = (etapa) => {
    if (etapa.data_real_fim) return { label: 'Concluído', class: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
    if (etapa.data_real_inicio) return { label: 'Em Andamento', class: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' };
    return { label: 'A Iniciar', class: 'bg-slate-800 text-slate-400 border border-slate-700' };
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Cronograma Físico</h2>
          <p className="text-sm text-slate-400 mt-1">
            Controle de etapas e prazos de execução.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
          <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button 
              onClick={() => exportCronogramaPDF(etapas, currentObraNome, currentClienteNome, currentObra)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Gráfico de Gantt"
            >
              <Printer className="w-4 h-4" />
              <span>Gantt</span>
            </button>
            <button 
              onClick={() => exportCronogramaTabelaPDF(etapas, currentObraNome, currentClienteNome)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
              title="Tabela de Prazos"
            >
              <Printer className="w-4 h-4" />
              <span>Tabela</span>
            </button>
          </div>
          <button 
            onClick={() => {
              setFormEtapa({ nome: '', data_prevista_inicio: '', data_prevista_fim: '', etapa_pai_id: null });
              setIsModalOpen(true);
            }}
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

        {etapas.filter(e => !e.etapa_pai_id).map((etapa) => {
          const subEtapas = etapas.filter(sub => sub.etapa_pai_id === etapa.id);
          const status = getStatus(etapa);
          return (
            <div key={etapa.id} className="space-y-2">
              <div className="glass-card p-5 rounded-2xl hover:border-slate-700/80 transition-colors group">
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setFormEtapa({ nome: '', data_prevista_inicio: '', data_prevista_fim: '', etapa_pai_id: etapa.id });
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Sub-etapa
                    </button>
                    {!etapa.data_real_inicio && !etapa.data_real_fim && (
                      <button onClick={() => handleToggleEtapaStatus(etapa.id, true, false)} className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-bold rounded-lg transition-colors cursor-pointer">
                        Iniciar
                      </button>
                    )}
                    {etapa.data_real_inicio && !etapa.data_real_fim && (
                      <button onClick={() => handleToggleEtapaStatus(etapa.id, false, true)} className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg transition-colors cursor-pointer">
                        Concluir
                      </button>
                    )}
                    {etapa.data_real_fim && (
                      <button onClick={() => handleReabrirEtapa(etapa.id)} className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold rounded-lg transition-colors cursor-pointer">
                        Reabrir
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteEtapa(etapa.id, etapa.nome)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Etapa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Sub-etapas */}
              {subEtapas.length > 0 && (
                <div className="pl-8 space-y-2 relative before:absolute before:left-4 before:top-0 before:bottom-4 before:w-px before:bg-slate-800">
                  {subEtapas.map(sub => {
                    const subStatus = getStatus(sub);
                    return (
                      <div key={sub.id} className="relative before:absolute before:left-[-1rem] before:top-1/2 before:w-4 before:h-px before:bg-slate-800 glass-card p-4 rounded-xl hover:border-slate-700/80 transition-colors group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${subStatus.class}`}>
                                {subStatus.label}
                              </span>
                              <span className="text-xs text-slate-400">
                                Prazo: {formatDate(sub.data_prevista_inicio)} até {formatDate(sub.data_prevista_fim)}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-slate-200">{sub.nome}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            {!sub.data_real_inicio && !sub.data_real_fim && (
                              <button onClick={() => handleToggleEtapaStatus(sub.id, true, false)} className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-bold rounded-lg transition-colors cursor-pointer">
                                Iniciar
                              </button>
                            )}
                            {sub.data_real_inicio && !sub.data_real_fim && (
                              <button onClick={() => handleToggleEtapaStatus(sub.id, false, true)} className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg transition-colors cursor-pointer">
                                Concluir
                              </button>
                            )}
                            {sub.data_real_fim && (
                              <button onClick={() => handleReabrirEtapa(sub.id)} className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold rounded-lg transition-colors cursor-pointer">
                                Reabrir
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEtapa(sub.id, sub.nome)}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Excluir Sub-etapa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Nova Etapa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">{formEtapa.etapa_pai_id ? 'Adicionar Sub-etapa' : 'Adicionar Etapa'}</h3>
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

              
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer">Salvar Etapa</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDeleteModal
        isOpen={!!deletingEtapa}
        onClose={() => setDeletingEtapa(null)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta etapa do cronograma?"
        itemName={deletingEtapa?.nome}
      />
    </div>
  );
}

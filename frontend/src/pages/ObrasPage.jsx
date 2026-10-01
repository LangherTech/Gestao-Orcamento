import React, { useState } from 'react';
import { Building2, Plus, Calendar, MapPin, DollarSign, ArrowUpRight, X, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function ObrasPage({ obras, onSelectObra, onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cliente: '',
    endereco: '',
    orcamento_materiais: '',
    orcamento_empreiteiros: '',
    orcamento_caixa: '',
    status: 'ativa'
  });

  const formatMoney = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        orcamento_materiais: parseFloat(String(formData.orcamento_materiais || 0).replace(',', '.')) || 0,
        orcamento_empreiteiros: parseFloat(String(formData.orcamento_empreiteiros || 0).replace(',', '.')) || 0,
        orcamento_caixa: parseFloat(String(formData.orcamento_caixa || 0).replace(',', '.')) || 0
      };
      
      await api.post('/obras', payload);
      setIsModalOpen(false);
      setFormData({ 
        nome: '', 
        cliente: '', 
        endereco: '', 
        orcamento_materiais: '', 
        orcamento_empreiteiros: '', 
        orcamento_caixa: '', 
        status: 'ativa' 
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setError('Erro ao salvar a obra. Verifique os dados e tente novamente.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Obras & Projetos</h2>
          <p className="text-sm text-slate-400 mt-1">Gerenciamento dos canteiros, contratos e status de execução.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all w-fit cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Obra</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {obras.map((obra) => (
          <div key={obra.id} className="glass-card p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${
                    obra.status === 'ativa' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : obra.status === 'concluida'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {obra.status}
                  </span>
                  <h3 className="text-lg font-bold text-white">{obra.nome}</h3>
                  <p className="text-xs text-slate-300 font-medium">{obra.cliente}</p>
                </div>
              </div>

              {obra.endereco && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{obra.endereco}</span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Orçamento Aprovado:</span>
                  <span className="font-bold text-white">{formatMoney(obra.valor_aprovado)}</span>
                </div>
                {obra.valor_pendente_aprovacao > 0 && (
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-amber-400/80">Pendente de Aprovação:</span>
                    <span className="font-bold text-amber-400">{formatMoney(obra.valor_pendente_aprovacao)}</span>
                  </div>
                )}
                {(obra.orcamento_materiais > 0 || obra.orcamento_empreiteiros > 0 || obra.orcamento_caixa > 0) && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Materiais</span>
                      <span className="text-blue-400 font-semibold">{formatMoney(obra.orcamento_materiais)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Empreiteiros</span>
                      <span className="text-amber-400 font-semibold">{formatMoney(obra.orcamento_empreiteiros)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Caixa Obra</span>
                      <span className="text-emerald-400 font-semibold">{formatMoney(obra.orcamento_caixa)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => onSelectObra(obra.id)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 text-emerald-400 hover:text-emerald-300 border border-slate-700/60 transition-all cursor-pointer"
            >
              <span>Acessar Painel da Obra</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        ))}
        {obras.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
            Nenhuma obra cadastrada no momento.
          </div>
        )}
      </div>

      {/* Modal Nova Obra */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-lg font-bold text-white">Nova Obra</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              
              <form id="obra-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Nome da Obra *</label>
                  <input
                    type="text"
                    name="nome"
                    required
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Ex: Residência Alphaville"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Cliente / Contratante</label>
                  <input
                    type="text"
                    name="cliente"
                    value={formData.cliente}
                    onChange={handleInputChange}
                    placeholder="Ex: Família Albuquerque"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Endereço</label>
                  <input
                    type="text"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleInputChange}
                    placeholder="Rua, Número, Bairro, Cidade"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    >
                      <option value="ativa">Ativa</option>
                      <option value="concluida">Concluída</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>

                {/* Tetos Orçamentários por Categoria (Alternativa B) */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Tetos Orçamentários por Categoria
                    </span>
                    <span className="text-[10px] text-slate-500">Auto-sugerido (55% / 40% / 5%)</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-blue-400 font-medium">Materiais (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="orcamento_materiais"
                        value={formData.orcamento_materiais}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-amber-400 font-medium">Empreiteiros (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="orcamento_empreiteiros"
                        value={formData.orcamento_empreiteiros}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-emerald-400 font-medium">Caixa Pequeno (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="orcamento_caixa"
                        value={formData.orcamento_caixa}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/20">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="obra-form"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Obra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

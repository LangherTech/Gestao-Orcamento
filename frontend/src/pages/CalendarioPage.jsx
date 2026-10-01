import React, { useState, useEffect } from 'react';
import { Users2, Plus, Calendar, Clock, HardHat, X } from 'lucide-react';
import api from '../services/api';

export default function CalendarioPage({ obras = [] }) {
  const [funcionarios, setFuncionarios] = useState([]);
  const [alocacoes, setAlocacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('funcionario'); // 'funcionario' ou 'alocacao'
  const [formData, setFormData] = useState({
    nome: '',
    ativo: true,
    obra_id: '',
    funcionario_id: '',
    data_inicio: '',
    data_fim: '',
    periodo: 'dia_inteiro'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [funcRes, alocRes] = await Promise.all([
        api.get('/calendario/funcionarios'),
        api.get('/calendario/alocacoes')
      ]);
      if (funcRes.data) setFuncionarios(funcRes.data);
      if (alocRes.data) setAlocacoes(alocRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados do calendário:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'funcionario') {
        await api.post('/calendario/funcionarios', {
          nome: formData.nome,
          ativo: formData.ativo
        });
      } else {
        await api.post('/calendario/alocacoes', {
          obra_id: formData.obra_id,
          funcionario_id: formData.funcionario_id,
          data_inicio: formData.data_inicio,
          data_fim: formData.data_fim,
          periodo: formData.periodo
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar os dados.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Equipe & Alocações</h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestão de colaboradores próprios (CLT) e alocações por obra com divisão por turnos.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setModalType('funcionario'); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all cursor-pointer border border-slate-700"
          >
            <Users2 className="w-4 h-4" />
            <span>Novo Funcionário</span>
          </button>
          <button 
            onClick={() => { setModalType('alocacao'); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Alocar Equipe</span>
          </button>
        </div>
      </div>

      {loading ? (
         <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alocacoes.map((aloc) => (
            <div key={aloc.id} className="glass-card p-5 rounded-2xl flex items-center justify-between border border-slate-800/60 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
                  {aloc.funcionario_nome.split(' ').map((n, idx) => idx < 2 ? n[0] : '').join('')}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{aloc.funcionario_nome}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" /> {new Date(aloc.data_inicio).toLocaleDateString('pt-BR')} até {new Date(aloc.data_fim).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-emerald-400 block">{aloc.obra}</span>
                <span className="text-[11px] text-slate-400 font-medium capitalize mt-1 block bg-slate-800 px-2 py-0.5 rounded-full inline-block">
                  {aloc.periodo.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
          {alocacoes.length === 0 && (
            <div className="col-span-1 md:col-span-2 text-center py-10 text-slate-500">
              Nenhuma alocação registrada no momento.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {modalType === 'funcionario' ? 'Novo Funcionário' : 'Nova Alocação'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {modalType === 'funcionario' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={e => setFormData({...formData, nome: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Ex: João da Silva"
                  />
                </div>
              )}

              {modalType === 'alocacao' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Funcionário</label>
                    <select
                      required
                      value={formData.funcionario_id}
                      onChange={e => setFormData({...formData, funcionario_id: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Selecione um funcionário...</option>
                      {funcionarios.map(f => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Obra</label>
                    <select
                      required
                      value={formData.obra_id}
                      onChange={e => setFormData({...formData, obra_id: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Selecione uma obra...</option>
                      {obras.map(o => (
                        <option key={o.id} value={o.id}>{o.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Data Início</label>
                      <input
                        type="date"
                        required
                        value={formData.data_inicio}
                        onChange={e => setFormData({...formData, data_inicio: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Data Fim</label>
                      <input
                        type="date"
                        required
                        value={formData.data_fim}
                        onChange={e => setFormData({...formData, data_fim: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Turno</label>
                    <select
                      required
                      value={formData.periodo}
                      onChange={e => setFormData({...formData, periodo: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                    >
                      <option value="dia_inteiro">Dia Inteiro</option>
                      <option value="manha">Manhã</option>
                      <option value="tarde">Tarde</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

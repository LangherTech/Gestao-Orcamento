import React, { useState, useEffect } from 'react';
import { HardHat, Plus, CheckCircle, FileText, X, Building2, Calculator } from 'lucide-react';
import api from '../services/api';

export default function GestaoPage({ obras }) {
  const [contratos, setContratos] = useState([]);
  const [empreiteiros, setEmpreiteiros] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
  const [isMedicaoModalOpen, setIsMedicaoModalOpen] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState(null);

  const [empData, setEmpData] = useState({ nome: '', area_atuacao: '', telefone: '', cpf_cnpj: '' });
  const [contratoData, setContratoData] = useState({ obra_id: '', empreiteiro_id: '', tipo_contrato: 'por_medicao', valor_total: '', escopo: '' });
  const [medicaoData, setMedicaoData] = useState({ data_medicao: new Date().toISOString().split('T')[0], quantidade_executada: '', preco_unitario: '' });

  const fetchDados = async () => {
    setIsLoading(true);
    try {
      const [resContratos, resEmp] = await Promise.all([
        api.get('/gestao/contratos'),
        api.get('/gestao/empreiteiros')
      ]);
      setContratos(resContratos.data || []);
      setEmpreiteiros(resEmp.data || []);
    } catch (error) {
      console.error("Erro ao buscar dados de gestão:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, []);

  const formatMoney = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const handleCreateEmpreiteiro = async (e) => {
    e.preventDefault();
    try {
      await api.post('/gestao/empreiteiros', empData);
      setIsEmpModalOpen(false);
      setEmpData({ nome: '', area_atuacao: '', telefone: '', cpf_cnpj: '' });
      fetchDados();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar empreiteiro.');
    }
  };

  const handleCreateContrato = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...contratoData,
        valor_total: parseFloat(contratoData.valor_total.replace(',', '.')) || 0
      };
      await api.post('/gestao/contratos', payload);
      setIsContratoModalOpen(false);
      setContratoData({ obra_id: '', empreiteiro_id: '', tipo_contrato: 'por_medicao', valor_total: '', escopo: '' });
      fetchDados();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar contrato.');
    }
  };

  const handleCreateMedicao = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        contrato_id: selectedContratoId,
        data_medicao: medicaoData.data_medicao,
        quantidade_executada: parseFloat(medicaoData.quantidade_executada.replace(',', '.')) || 0,
        preco_unitario: parseFloat(medicaoData.preco_unitario.replace(',', '.')) || 0
      };
      await api.post('/gestao/medicoes', payload);
      setIsMedicaoModalOpen(false);
      setMedicaoData({ data_medicao: new Date().toISOString().split('T')[0], quantidade_executada: '', preco_unitario: '' });
      fetchDados();
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar medição.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Empreiteiros & Terceirizados</h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestão de contratos (valor fechado ou medição) e apuração de pagamentos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEmpModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-all cursor-pointer"
          >
            <HardHat className="w-4 h-4 text-emerald-400" />
            <span>Novo Empreiteiro</span>
          </button>
          <button 
            onClick={() => setIsContratoModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Contrato</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="text-slate-400 py-10 col-span-2 text-center">Carregando contratos...</div>
        ) : contratos.length === 0 ? (
          <div className="text-slate-500 py-10 col-span-2 text-center border border-slate-800 border-dashed rounded-xl">
            Nenhum contrato ativo.
          </div>
        ) : (
          contratos.map((c) => (
            <div key={c.id} className="glass-card p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    c.tipo_contrato === 'por_medicao' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  }`}>
                    {c.tipo_contrato === 'por_medicao' ? 'Por Medição' : 'Valor Fechado'}
                  </span>
                  <span className="text-xs text-slate-400">{c.telefone}</span>
                </div>
                <h3 className="text-base font-bold text-white">{c.empreiteiro_nome}</h3>
                <p className="text-xs text-slate-300 font-medium mb-3">{c.area || 'Geral'} • Obra: {c.obra_nome}</p>

                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs space-y-1 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Contrato:</span>
                    <span className="font-bold text-white">{formatMoney(c.valor_total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Medido:</span>
                    <span className="font-bold text-emerald-400">{formatMoney(c.medido_ate_agora)}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setSelectedContratoId(c.id);
                  setIsMedicaoModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Registrar Boletim de Medição</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal Empreiteiro */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Novo Empreiteiro</h3>
              <button onClick={() => setIsEmpModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form id="emp-form" onSubmit={handleCreateEmpreiteiro} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Nome / Empresa *</label>
                  <input type="text" required value={empData.nome} onChange={e => setEmpData({...empData, nome: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Área de Atuação</label>
                  <input type="text" value={empData.area_atuacao} onChange={e => setEmpData({...empData, area_atuacao: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1.5 block">Telefone</label>
                    <input type="text" value={empData.telefone} onChange={e => setEmpData({...empData, telefone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1.5 block">CPF/CNPJ</label>
                    <input type="text" value={empData.cpf_cnpj} onChange={e => setEmpData({...empData, cpf_cnpj: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/20">
              <button onClick={() => setIsEmpModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white">Cancelar</button>
              <button type="submit" form="emp-form" className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Contrato */}
      {isContratoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Novo Contrato</h3>
              <button onClick={() => setIsContratoModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <form id="contrato-form" onSubmit={handleCreateContrato} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1.5 block">Obra *</label>
                    <select required value={contratoData.obra_id} onChange={e => setContratoData({...contratoData, obra_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none">
                      <option value="">Selecione...</option>
                      {obras?.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1.5 block">Empreiteiro *</label>
                    <select required value={contratoData.empreiteiro_id} onChange={e => setContratoData({...contratoData, empreiteiro_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none">
                      <option value="">Selecione...</option>
                      {empreiteiros?.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1.5 block">Tipo Contrato</label>
                    <select value={contratoData.tipo_contrato} onChange={e => setContratoData({...contratoData, tipo_contrato: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none">
                      <option value="por_medicao">Por Medição</option>
                      <option value="valor_fechado">Valor Fechado</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1.5 block">Valor Total Previsto (R$)</label>
                    <input type="number" step="0.01" required value={contratoData.valor_total} onChange={e => setContratoData({...contratoData, valor_total: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Escopo Resumido</label>
                  <textarea value={contratoData.escopo} onChange={e => setContratoData({...contratoData, escopo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" rows="2"></textarea>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/20">
              <button onClick={() => setIsContratoModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white">Cancelar</button>
              <button type="submit" form="contrato-form" className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg">Criar Contrato</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Medicao */}
      {isMedicaoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Registrar Medição</h3>
              <button onClick={() => setIsMedicaoModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form id="med-form" onSubmit={handleCreateMedicao} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Data da Medição</label>
                  <input type="date" required value={medicaoData.data_medicao} onChange={e => setMedicaoData({...medicaoData, data_medicao: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1.5 block">Qtd. Executada</label>
                    <input type="number" step="0.01" required value={medicaoData.quantidade_executada} onChange={e => setMedicaoData({...medicaoData, quantidade_executada: e.target.value})} placeholder="Ex: 50.5" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1.5 block">Preço Unitário (R$)</label>
                    <input type="number" step="0.01" required value={medicaoData.preco_unitario} onChange={e => setMedicaoData({...medicaoData, preco_unitario: e.target.value})} placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                  </div>
                </div>
                <div className="pt-2">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-between">
                    <span className="text-sm font-semibold">Valor a Pagar:</span>
                    <span className="text-lg font-bold">
                      {formatMoney((parseFloat(medicaoData.quantidade_executada) || 0) * (parseFloat(medicaoData.preco_unitario) || 0))}
                    </span>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/20">
              <button onClick={() => setIsMedicaoModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white">Cancelar</button>
              <button type="submit" form="med-form" className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg">Aprovar Medição</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


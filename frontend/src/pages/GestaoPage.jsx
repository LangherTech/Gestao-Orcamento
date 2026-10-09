import React, { useState, useEffect, useMemo } from 'react';
import { 
  HardHat, Plus, CheckCircle, FileText, X, Building2, Calculator,
  Search, Phone, Mail, MapPin, CreditCard, Pencil, Trash2, 
  Users, Briefcase, MessageCircle, Filter, AlertCircle, Check
} from 'lucide-react';
import api from '../services/api';
import { formatTelefone, formatCPFouCNPJ } from '../utils/masks';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function GestaoPage({ selectedObraId, obras = [], user }) {
  const [activeTab, setActiveTab] = useState('terceiros'); // 'terceiros' | 'contratos'
  const [contratoStatusFilter, setContratoStatusFilter] = useState('ativos');
  const [contratos, setContratos] = useState([]);
  const [empreiteiros, setEmpreiteiros] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('todas');
  const [filtroObraContrato, setFiltroObraContrato] = useState('todas');

  // Modais
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmpreiteiro, setEditingEmpreiteiro] = useState(null);
  const [isDeleteEmpModalOpen, setIsDeleteEmpModalOpen] = useState(false);
  const [deletingEmpreiteiro, setDeletingEmpreiteiro] = useState(null);

  const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
  const [isMedicaoModalOpen, setIsMedicaoModalOpen] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState(null);
  
  const [cancelingContrato, setCancelingContrato] = useState(null);
  const [deletingContrato, setDeletingContrato] = useState(null);

  // Estados de formulário
  const initialEmpForm = {
    nome: '',
    area_atuacao: '',
    telefone: '',
    cpf_cnpj: '',
    email: '',
    endereco: '',
    pix: '',
    ativo: true
  };
  const [empForm, setEmpForm] = useState(initialEmpForm);

  const initialContratoData = {
    obra_id: selectedObraId || '',
    empreiteiro_id: '',
    tipo_contrato: 'por_medicao',
    valor_total: '',
    data_assinatura: '',
    data_termino: '',
    escopo: ''
  };
  const [contratoData, setContratoData] = useState(initialContratoData);

  const [pagamentoData, setPagamentoData] = useState({
    data_pagamento: new Date().toISOString().split('T')[0],
    valor_pago: '',
    tipo_pagamento: 'Semanal',
    anexo_url: '',
    observacoes: ''
  });

  const showToast = (message, type = 'success') => {
    let finalMessage = message;
    if (Array.isArray(message)) {
      finalMessage = message.map(m => m?.msg || JSON.stringify(m)).join(', ');
    }
    setToast({ message: finalMessage, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDados = async () => {
    setIsLoading(true);
    try {
      const [resContratos, resEmp] = await Promise.all([
        api.get(`/gestao/contratos${selectedObraId ? `?obra_id=${selectedObraId}` : ''}`),
        api.get('/gestao/empreiteiros')
      ]);
      setContratos(resContratos.data || []);
      setEmpreiteiros(resEmp.data || []);
    } catch (error) {
      console.error("Erro ao buscar dados de gestão:", error);
      showToast('Erro ao carregar dados de empreiteiros e contratos.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, [selectedObraId]);

  const formatMoney = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Abre modal para cadastrar novo empreiteiro
  const handleOpenNewEmpreiteiro = () => {
    setEditingEmpreiteiro(null);
    setEmpForm(initialEmpForm);
    setIsEmpModalOpen(true);
  };

  // Abre modal para editar empreiteiro existente
  const handleOpenEditEmpreiteiro = (emp) => {
    setEditingEmpreiteiro(emp);
    setEmpForm({
      nome: emp.nome || '',
      area_atuacao: emp.area_atuacao || '',
      telefone: emp.telefone ? formatTelefone(emp.telefone) : '',
      cpf_cnpj: emp.cpf_cnpj ? formatCPFouCNPJ(emp.cpf_cnpj) : '',
      email: emp.email || '',
      endereco: emp.endereco || '',
      ativo: emp.ativo !== false
    });
    setIsEmpModalOpen(true);
  };

  // Salvar empreiteiro (criação ou edição)
  const handleSaveEmpreiteiro = async (e) => {
    e.preventDefault();
    try {
      if (editingEmpreiteiro) {
        await api.put(`/gestao/empreiteiros/${editingEmpreiteiro.id}`, empForm);
        showToast(`Terceiro "${empForm.nome}" atualizado com sucesso!`);
      } else {
        await api.post('/gestao/empreiteiros', empForm);
        showToast(`Terceiro "${empForm.nome}" cadastrado com sucesso!`);
      }
      setIsEmpModalOpen(false);
      setEditingEmpreiteiro(null);
      setEmpForm(initialEmpForm);
      fetchDados();
    } catch (err) {
      console.error("Erro ao salvar empreiteiro:", err);
      const detail = err?.response?.data?.detail;
      showToast(detail || 'Erro ao salvar empreiteiro. Verifique os dados.', 'error');
    }
  };

  // Confirmar exclusão de empreiteiro
  const handleConfirmDeleteEmpreiteiro = async () => {
    if (!deletingEmpreiteiro) return;
    try {
      await api.delete(`/gestao/empreiteiros/${deletingEmpreiteiro.id}`);
      showToast(`Terceiro "${deletingEmpreiteiro.nome}" removido com sucesso.`);
      setIsDeleteEmpModalOpen(false);
      setDeletingEmpreiteiro(null);
      fetchDados();
    } catch (err) {
      console.error("Erro ao excluir empreiteiro:", err);
      const detail = err?.response?.data?.detail;
      showToast(detail || 'Não foi possível excluir o empreiteiro.', 'error');
    }
  };

  // Abre modal de contrato já pré-selecionando o empreiteiro
  const handleOpenContratoForEmpreiteiro = (empreiteiroId) => {
    setContratoData({
      ...initialContratoData,
      empreiteiro_id: empreiteiroId,
      obra_id: obras && obras.length > 0 ? obras[0].id : ''
    });
    setIsContratoModalOpen(true);
  };

  // Criar contrato
  const handleCreateContrato = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...contratoData,
        data_assinatura: contratoData.data_assinatura || null,
        data_termino: contratoData.data_termino || null,
        valor_total: parseFloat(String(contratoData.valor_total || 0).replace(',', '.')) || 0
      };
      await api.post('/gestao/contratos', payload);
      showToast('Contrato criado com sucesso!');
      setIsContratoModalOpen(false);
      setContratoData(initialContratoData);
      fetchDados();
    } catch (err) {
      console.error("Erro ao criar contrato:", err);
      showToast('Erro ao criar contrato.', 'error');
    }
  };

  // Registrar pagamento
  const handleCreatePagamento = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        contrato_id: selectedContratoId,
        data_pagamento: pagamentoData.data_pagamento,
        valor_pago: parseFloat(String(pagamentoData.valor_pago || 0).replace(',', '.')) || 0,
        tipo_pagamento: pagamentoData.tipo_pagamento || 'Semanal',
        anexo_url: pagamentoData.anexo_url || null,
        observacoes: pagamentoData.observacoes || ''
      };
      await api.post('/gestao/pagamentos', payload);
      showToast('Pagamento registrado com sucesso!');
      setIsMedicaoModalOpen(false);
      setPagamentoData({ data_pagamento: new Date().toISOString().split('T')[0], valor_pago: '', tipo_pagamento: 'Semanal', observacoes: '', anexo_url: '' });
      fetchDados();
    } catch (err) {
      console.error("Erro ao registrar pagamento:", err);
      showToast('Erro ao registrar pagamento.', 'error');
    }
  };

  const handleUpdateContratoStatus = async (id, newStatus, arquivado) => {
    if (newStatus === 'cancelado') {
      setCancelingContrato(id);
      return;
    }
    await executeUpdateContratoStatus(id, newStatus, arquivado);
  };

  const executeUpdateContratoStatus = async (id, newStatus, arquivado) => {
    try {
      await api.patch(`/gestao/contratos/${id}/status`, { status: newStatus, arquivado });
      showToast(`Contrato ${newStatus === 'cancelado' ? 'cancelado' : 'atualizado'} com sucesso!`);
      if (newStatus === 'cancelado') setCancelingContrato(null);
      fetchDados();
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      showToast('Erro ao atualizar status do contrato.', 'error');
    }
  };

  const handleDeleteContrato = (id) => {
    setDeletingContrato(id);
  };

  const executeDeleteContrato = async () => {
    if (!deletingContrato) return;
    try {
      await api.delete(`/gestao/contratos/${deletingContrato}`);
      showToast('Contrato excluído com sucesso!');
      setDeletingContrato(null);
      fetchDados();
    } catch (err) {
      console.error("Erro ao excluir contrato:", err);
      showToast('Erro ao excluir contrato.', 'error');
    }
  };

  // Lista de áreas de atuação únicas para filtro
  const areasAtuacaoDisponiveis = useMemo(() => {
    const setAreas = new Set();
    empreiteiros.forEach(e => {
      if (e.area_atuacao && e.area_atuacao.trim()) {
        setAreas.add(e.area_atuacao.trim());
      }
    });
    return Array.from(setAreas).sort();
  }, [empreiteiros]);

  // Empreiteiros filtrados
  const empreiteirosFiltrados = useMemo(() => {
    return empreiteiros.filter(e => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch = !term || (
        (e.nome && e.nome.toLowerCase().includes(term)) ||
        (e.area_atuacao && e.area_atuacao.toLowerCase().includes(term)) ||
        (e.telefone && e.telefone.toLowerCase().includes(term)) ||
        (e.cpf_cnpj && e.cpf_cnpj.toLowerCase().includes(term)) ||
        (e.email && e.email.toLowerCase().includes(term))
      );

      const matchArea = selectedArea === 'todas' || (e.area_atuacao && e.area_atuacao.toLowerCase() === selectedArea.toLowerCase());

      return matchSearch && matchArea;
    });
  }, [empreiteiros, searchTerm, selectedArea]);

  // Contratos filtrados por obra, busca e status
  const contratosFiltrados = useMemo(() => {
    let filtered = contratos;
    
    // Filtro de obra
    if (filtroObraContrato !== 'todas') {
      filtered = filtered.filter(c => String(c.obra_id) === String(filtroObraContrato));
    }
    
    // Filtro de busca global
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      filtered = filtered.filter(c => 
        (c.empreiteiro_nome && c.empreiteiro_nome.toLowerCase().includes(term)) ||
        (c.escopo && c.escopo.toLowerCase().includes(term)) ||
        (c.obra_nome && c.obra_nome.toLowerCase().includes(term))
      );
    }
    
    // Filtro de Status
    if (contratoStatusFilter === 'ativos') {
      filtered = filtered.filter(c => c.status === 'ativo' && !c.arquivado);
    } else if (contratoStatusFilter === 'arquivados') {
      filtered = filtered.filter(c => c.status === 'finalizado' || c.arquivado);
    } else if (contratoStatusFilter === 'cancelados') {
      filtered = filtered.filter(c => c.status === 'cancelado');
    }
    // 'todos' não filtra por status

    return filtered;
  }, [contratos, filtroObraContrato, searchTerm, contratoStatusFilter]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalEmpreiteiros = empreiteiros.length;
    const totalContratos = contratos.length;
    const contratosAtivos = contratos.filter(c => c.status === 'ativo' || !c.status).length;
    const valorTotalContratos = contratos.reduce((acc, c) => acc + (parseFloat(c.valor_total) || 0), 0);
    const valorTotalMedido = contratos.reduce((acc, c) => acc + (parseFloat(c.medido_ate_agora) || 0), 0);

    return {
      totalEmpreiteiros,
      totalContratos,
      contratosAtivos,
      valorTotalContratos,
      valorTotalMedido
    };
  }, [empreiteiros, contratos]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-bounce-short ${
          toast.type === 'error' 
            ? 'bg-rose-950/90 border-rose-800 text-rose-200' 
            : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Módulo Operacional
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HardHat className="w-7 h-7 text-emerald-400" />
            Terceiros
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Cadastro de serviços parceiros terceirizados, contratos por obra e registros de pagamentos.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={handleOpenNewEmpreiteiro}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Terceiro</span>
          </button>

          <button 
            onClick={() => {
              setContratoData(initialContratoData);
              setIsContratoModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-slate-200 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Novo Contrato</span>
          </button>
        </div>
      </div>

      {/* KPIs / Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Terceiros Cadastrados</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white tracking-tight">{stats.totalEmpreiteiros}</span>
            <span className="text-xs text-slate-400 block mt-0.5">terceiros ativos no sistema</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Contratos Ativos</span>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white tracking-tight">{stats.contratosAtivos}</span>
            <span className="text-xs text-slate-400 block mt-0.5">de {stats.totalContratos} contratos no total</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Total Contratado</span>
            <Calculator className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white tracking-tight">{formatMoney(stats.valorTotalContratos)}</span>
            <span className="text-xs text-slate-400 block mt-0.5">em todas as obras</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Total Medido / Executado</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">{formatMoney(stats.valorTotalMedido)}</span>
            <span className="text-xs text-slate-400 block mt-0.5">
              {stats.valorTotalContratos > 0 
                ? `${Math.round((stats.valorTotalMedido / stats.valorTotalContratos) * 100)}% apurado` 
                : 'nenhum contrato apurado'}
            </span>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="border-b border-slate-800 flex items-center gap-6">
        <button
          onClick={() => setActiveTab('empreiteiros')}
          className={`flex items-center gap-2.5 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'empreiteiros'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardHat className="w-4 h-4" />
          <span>Terceiros & Parceiros</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-normal">
            {empreiteiros.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('contratos')}
          className={`flex items-center gap-2.5 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'contratos'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Contratos</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-normal">
            {contratos.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: LISTAGEM DE EMPREITEIROS CADASTRADOS              */}
      {/* ======================================================== */}
      {activeTab === 'empreiteiros' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, especialidade, telefone ou CPF/CNPJ..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtro por Área de Atuação */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedArea}
                onChange={e => setSelectedArea(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="todas">Todas as Especialidades</option>
                {areasAtuacaoDisponiveis.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid de Cards de Empreiteiros */}
          {isLoading ? (
            <div className="text-slate-400 py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400 mb-2"></div>
              <p className="text-sm">Carregando lista de empreiteiros...</p>
            </div>
          ) : empreiteirosFiltrados.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-2xl p-12 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
                <HardHat className="w-7 h-7 text-emerald-400/70" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-semibold text-white">Nenhum empreiteiro encontrado</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {searchTerm || selectedArea !== 'todas'
                    ? 'Nenhum profissional corresponde aos filtros de busca aplicados.'
                    : 'Cadastre os profissionais e empresas que executam serviços nas suas obras.'}
                </p>
              </div>
              <button
                onClick={handleOpenNewEmpreiteiro}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeiro Terceiro</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {empreiteirosFiltrados.map((emp) => {
                const cleanPhone = emp.telefone ? emp.telefone.replace(/\D/g, '') : '';
                const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;
                const initials = (emp.nome || 'E')
                  .split(' ')
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div 
                    key={emp.id} 
                    className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm hover:shadow-md"
                  >
                    <div>
                      {/* Topo do Card */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm tracking-wider">
                            {initials}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors leading-tight">
                              {emp.nome}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {emp.area_atuacao || 'Geral / Multidisciplinar'}
                              </span>
                              {emp.ativo === false && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-800 text-slate-400">
                                  Inativo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação do Card */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditEmpreiteiro(emp)}
                            title="Editar Dados"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingEmpreiteiro(emp);
                              setIsDeleteEmpModalOpen(true);
                            }}
                            title="Excluir Terceiro"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Informações de Contato */}
                      <div className="space-y-1.5 text-xs text-slate-300 py-3 border-t border-slate-800/80 my-3">
                        {emp.telefone ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-slate-400">
                              <Phone className="w-3.5 h-3.5 text-slate-500" />
                              <span>{emp.telefone}</span>
                            </span>
                            {whatsappUrl && (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Phone className="w-3.5 h-3.5" />
                            <span>Sem telefone cadastrado</span>
                          </div>
                        )}

                        {emp.cpf_cnpj && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                            <span>CPF/CNPJ: {emp.cpf_cnpj}</span>
                          </div>
                        )}

                        {emp.email && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span className="truncate">{emp.email}</span>
                          </div>
                        )}

                        {emp.endereco && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span className="truncate">{emp.endereco}</span>
                          </div>
                        )}
                      </div>

                      {/* Resumo de Contratos do Empreiteiro */}
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Contratos Ativos:</span>
                          <span className="font-semibold text-white">
                            {emp.contratos_ativos || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Total em Contratos:</span>
                          <span className="font-bold text-emerald-400">
                            {formatMoney(emp.valor_total_contratado || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Rodapé para Novo Contrato */}
                    <div className="pt-4">
                      <button
                        onClick={() => handleOpenContratoForEmpreiteiro(emp.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer border border-slate-700/60"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Novo Contrato para {emp.nome.split(' ')[0]}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: LISTAGEM DE CONTRATOS & MEDIÇÕES                  */}
      {/* ======================================================== */}
      {activeTab === 'contratos' && (
        <div className="space-y-4">
          {/* Filtro por Obra e Status */}
          <div className="flex flex-col gap-3 md:flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <label className="text-xs font-medium text-slate-400">Filtrar por Obra:</label>
              <select
                value={filtroObraContrato}
                onChange={e => setFiltroObraContrato(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="todas">Todas as Obras</option>
                {obras?.map(o => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>
            
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
              {['ativos', 'arquivados', 'cancelados', 'todos'].map(status => (
                <button
                  key={status}
                  onClick={() => setContratoStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    contratoStatusFilter === status 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setContratoData(initialContratoData);
                setIsContratoModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Contrato</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              <div className="text-slate-400 py-10 col-span-2 text-center">Carregando contratos...</div>
            ) : contratosFiltrados.length === 0 ? (
              <div className="text-slate-500 py-12 col-span-2 text-center border border-slate-800 border-dashed rounded-2xl">
                <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-400">Nenhum contrato encontrado.</p>
                <p className="text-xs text-slate-500 mt-1">Crie um contrato vinculando um empreiteiro a uma obra.</p>
              </div>
            ) : (
              contratosFiltrados.map((c) => (
                <div key={c.id} className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between transition-all shadow-sm">
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
                    <p className="text-xs text-slate-300 font-medium mb-3">
                      {c.area || 'Geral'} • <span className="text-emerald-400">Obra: {c.obra_nome}</span>
                    </p>

                    {c.escopo && (
                      <p className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 mb-3 line-clamp-2">
                        {c.escopo}
                      </p>
                    )}

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5 mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valor Total Contrato:</span>
                        <span className="font-bold text-white">{formatMoney(c.valor_total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Medido / Pago:</span>
                        <span className="font-bold text-emerald-400">{formatMoney(c.medido_ate_agora)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] pt-1 border-t border-slate-800 text-slate-400">
                        <span>Saldo Restante:</span>
                        <span className="font-semibold text-slate-200">
                          {formatMoney(Math.max(0, (parseFloat(c.valor_total) || 0) - (parseFloat(c.medido_ate_agora) || 0)))}
                        </span>
                      </div>
                    </div>
                    {c.created_by && (
                      <div className="text-[9px] text-slate-500 mb-2 px-1 text-right">
                        Contrato por {c.created_by === user?.id ? 'Você' : 'Sócio'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 mt-4">
                    {(!c.status || c.status === 'ativo') && !c.arquivado && (
                      <>
                        <button 
                          onClick={() => {
                            setSelectedContratoId(c.id);
                            setIsMedicaoModalOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer border border-slate-700/60"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Registrar Pagamento</span>
                        </button>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleUpdateContratoStatus(c.id, 'finalizado', true)}
                            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                          >
                            Finalizar (Arquivar)
                          </button>
                          <button 
                            onClick={() => handleUpdateContratoStatus(c.id, 'cancelado', false)}
                            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    )}

                    {(c.status === 'finalizado' || c.arquivado) && c.status !== 'cancelado' && (
                      <button 
                        onClick={() => handleUpdateContratoStatus(c.id, 'ativo', false)}
                        className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700/60"
                      >
                        Reativar (Desarquivar)
                      </button>
                    )}

                    {c.status === 'cancelado' && (
                      <button 
                        onClick={() => handleDeleteContrato(c.id)}
                        className="w-full py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all cursor-pointer border border-rose-500/20 flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir Definitivamente</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVO / EDITAR EMPREITEIRO                         */}
      {/* ======================================================== */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardHat className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {editingEmpreiteiro ? `Editar Terceiro — ${editingEmpreiteiro.nome}` : 'Cadastrar Novo Terceiro'}
                </h3>
              </div>
              <button onClick={() => setIsEmpModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[75vh]">
              <form id="emp-form" onSubmit={handleSaveEmpreiteiro} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Nome do Profissional / Razão Social *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Leandro Silva ou Silva Instalações"
                    value={empForm.nome} 
                    onChange={e => setEmpForm({...empForm, nome: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Área de Atuação / Especialidade</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Pedreiro, Pintor, Elétrica..."
                      value={empForm.area_atuacao} 
                      onChange={e => setEmpForm({...empForm, area_atuacao: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Telefone / WhatsApp</label>
                    <input 
                      type="text" 
                      placeholder="(47) 99999-9999"
                      value={empForm.telefone} 
                      maxLength={15}
                      onChange={e => setEmpForm({...empForm, telefone: formatTelefone(e.target.value)})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none font-mono" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">CPF ou CNPJ</label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      value={empForm.cpf_cnpj} 
                      maxLength={18}
                      onChange={e => setEmpForm({...empForm, cpf_cnpj: formatCPFouCNPJ(e.target.value)})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none font-mono" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">E-mail</label>
                    <input 
                      type="email" 
                      placeholder="contato@exemplo.com"
                      value={empForm.email} 
                      onChange={e => setEmpForm({...empForm, email: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                    />
                  </div>
                </div>                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Endereço / Cidade</label>
                    <input 
                      type="text" 
                      placeholder="Rua, Bairro, Cidade..."
                      value={empForm.endereco} 
                      onChange={e => setEmpForm({...empForm, endereco: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Chave Pix</label>
                    <input 
                      type="text" 
                      placeholder="CPF, E-mail, Telefone ou Aleatória"
                      value={empForm.pix} 
                      onChange={e => setEmpForm({...empForm, pix: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none font-mono" 
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={empForm.ativo} 
                      onChange={e => setEmpForm({...empForm, ativo: e.target.checked})} 
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Terceiro Ativo para novos contratos</span>
                  </label>
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/30">
              <button 
                type="button"
                onClick={() => setIsEmpModalOpen(false)} 
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                form="emp-form" 
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-all"
              >
                {editingEmpreiteiro ? 'Salvar Alterações' : 'Cadastrar Terceiro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE EMPREITEIRO            */}
      {/* ======================================================== */}
      {isDeleteEmpModalOpen && deletingEmpreiteiro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Excluir Terceiro?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Tem certeza que deseja remover o terceiro <strong className="text-white">"{deletingEmpreiteiro.nome}"</strong>?
              </p>
              {deletingEmpreiteiro.contratos_ativos > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Atenção: Este empreiteiro possui contratos vinculados. Exclua ou desvincule os contratos primeiro.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsDeleteEmpModalOpen(false);
                  setDeletingEmpreiteiro(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteEmpreiteiro}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-lg transition-all"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVO CONTRATO                                     */}
      {/* ======================================================== */}
      {isContratoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Novo Contrato de Terceiro</h3>
              </div>
              <button onClick={() => setIsContratoModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <form id="contrato-form" onSubmit={handleCreateContrato} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Obra de Destino *</label>
                    <select 
                      required 
                      value={contratoData.obra_id} 
                      onChange={e => setContratoData({...contratoData, obra_id: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Selecione a Obra...</option>
                      {obras?.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Terceiro / Prestador *</label>
                    <select 
                      required 
                      value={contratoData.empreiteiro_id} 
                      onChange={e => setContratoData({...contratoData, empreiteiro_id: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Selecione o Terceiro...</option>
                      {empreiteiros?.map(e => <option key={e.id} value={e.id}>{e.nome} {e.area_atuacao ? `(${e.area_atuacao})` : ''}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Modalidade do Contrato</label>
                    <select 
                      value={contratoData.tipo_contrato} 
                      onChange={e => setContratoData({...contratoData, tipo_contrato: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="por_medicao">Por Medição (Unitário)</option>
                      <option value="valor_fechado">Valor Fechado (Global)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Valor Total Previsto (R$) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      placeholder="0.00"
                      value={contratoData.valor_total} 
                      onChange={e => setContratoData({...contratoData, valor_total: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Data de Assinatura (Início) *</label>
                    <input 
                      type="date" 
                      required
                      value={contratoData.data_assinatura} 
                      onChange={e => setContratoData({...contratoData, data_assinatura: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Data Prevista de Término *</label>
                    <input 
                      type="date" 
                      required
                      value={contratoData.data_termino} 
                      onChange={e => setContratoData({...contratoData, data_termino: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Escopo Resumido dos Serviços</label>
                  <textarea 
                    value={contratoData.escopo} 
                    onChange={e => setContratoData({...contratoData, escopo: e.target.value})} 
                    placeholder="Descreva as tarefas e etapas incluídas neste contrato..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                    rows="3"
                  ></textarea>
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/30">
              <button 
                type="button"
                onClick={() => setIsContratoModalOpen(false)} 
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                form="contrato-form" 
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-all"
              >
                Criar Contrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTRAR PAGAMENTO                                 */}
      {/* ======================================================== */}
      {isMedicaoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Registrar Pagamento</h3>
              </div>
              <button onClick={() => setIsMedicaoModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <form id="med-form" onSubmit={handleCreatePagamento} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Tipo da Parcela</label>
                  <select 
                    value={pagamentoData.tipo_pagamento} 
                    onChange={e => setPagamentoData({...pagamentoData, tipo_pagamento: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Semanal">Semanal</option>
                    <option value="Quinzenal">Quinzenal</option>
                    <option value="Mensal">Mensal</option>
                    <option value="Final/Única">Final/Única</option>
                    <option value="Adiantamento">Adiantamento</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Data do Pagamento</label>
                    <input 
                      type="date" 
                      required 
                      value={pagamentoData.data_pagamento} 
                      onChange={e => setPagamentoData({...pagamentoData, data_pagamento: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Valor Pago (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      value={pagamentoData.valor_pago} 
                      onChange={e => setPagamentoData({...pagamentoData, valor_pago: e.target.value})} 
                      placeholder="0.00" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Anexo / Comprovante (URL)</label>
                  <input 
                    type="url" 
                    value={pagamentoData.anexo_url} 
                    onChange={e => setPagamentoData({...pagamentoData, anexo_url: e.target.value})} 
                    placeholder="https://..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Observações (Opcional)</label>
                  <textarea 
                    value={pagamentoData.observacoes} 
                    onChange={e => setPagamentoData({...pagamentoData, observacoes: e.target.value})} 
                    placeholder="Detalhes adicionais..." 
                    rows="2"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" 
                  />
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/30">
              <button 
                type="button"
                onClick={() => setIsMedicaoModalOpen(false)} 
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                form="med-form" 
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-all"
              >
                Registrar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: EXCLUSÃO DE CONTRATO */}
      <ConfirmDeleteModal
        isOpen={!!deletingContrato}
        onClose={() => setDeletingContrato(null)}
        onConfirm={executeDeleteContrato}
        title="Confirmar Exclusão"
        message="Deseja realmente excluir este contrato?"
      />

      {/* MODAL: CANCELAMENTO DE CONTRATO */}
      <ConfirmDeleteModal
        isOpen={!!cancelingContrato}
        onClose={() => setCancelingContrato(null)}
        onConfirm={() => executeUpdateContratoStatus(cancelingContrato, 'cancelado', false)}
        title="Confirmar Cancelamento"
        message="ATENÇÃO: Cancelar o contrato é irreversível, estornará os pagamentos e o saldo voltará para a obra. Confirma?"
        confirmText="Sim, Cancelar Contrato"
      />

    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users2, Plus, Calendar, Clock, HardHat, X, Search, Phone, Mail, 
  CreditCard, Pencil, Trash2, Filter, CheckCircle, AlertCircle, 
  Building2, Briefcase, MessageCircle, UserCheck, UserX, GraduationCap, Tag,
  Layers, AlertTriangle, CalendarDays, Check, Ban
} from 'lucide-react';
import api from '../services/api';
import { formatTelefone, formatCPF } from '../utils/masks';

export default function CalendarioPage({ selectedObraId, obras = [], user }) {
  const [activeTab, setActiveTab] = useState('funcionarios'); // 'funcionarios' | 'profissoes' | 'alocacoes' | 'visao_mensal' | 'equipes' | 'pagamentos'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [funcionarios, setFuncionarios] = useState([]);
  const [profissoes, setProfissoes] = useState([]);
  const [alocacoes, setAlocacoes] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [faltas, setFaltas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [fechamentoSemanal, setFechamentoSemanal] = useState([]);
  const [loadingFechamento, setLoadingFechamento] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modo de exibição do calendário mensal: 'geral' | 'por_obra' | 'por_colaborador'
  const [visaoModo, setVisaoModo] = useState('geral');
  const [calendarioModo, setCalendarioModo] = useState('mensal'); // 'mensal' | 'semanal'
  const [visaoSelectedObra, setVisaoSelectedObra] = useState('');
  const [visaoSelectedColaborador, setVisaoSelectedColaborador] = useState('');

  // Período padrão do fechamento semanal (segunda a domingo da semana atual)
  const getMondayStr = (d = new Date()) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(date.setDate(diff));
    return mon.toISOString().split('T')[0];
  };
  const getSundayStr = (d = new Date()) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() + (day === 0 ? 0 : 7 - day);
    const sun = new Date(date.setDate(diff));
    return sun.toISOString().split('T')[0];
  };
  const [fechamentoInicio, setFechamentoInicio] = useState(getMondayStr());
  const [fechamentoFim, setFechamentoFim] = useState(getSundayStr());

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCargo, setSelectedCargo] = useState('todos');
  const [filtroObra, setFiltroObra] = useState('todas');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
  const [profissaoSearchTerm, setProfissaoSearchTerm] = useState('');

  // Modais de Cadastro / Edição
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('funcionario'); // 'funcionario' | 'alocacao'
  const [editingFuncionario, setEditingFuncionario] = useState(null);

  // Modais de Profissões
  const [showProfissaoModal, setShowProfissaoModal] = useState(false);
  const [editingProfissao, setEditingProfissao] = useState(null);
  const [profissaoForm, setProfissaoForm] = useState({ nome: '' });
  const [isDeleteProfModalOpen, setIsDeleteProfModalOpen] = useState(false);
  const [deletingProfissao, setDeletingProfissao] = useState(null);
  const [savingProfissao, setSavingProfissao] = useState(false);

  // Modais de Exclusão
  const [isDeleteFuncModalOpen, setIsDeleteFuncModalOpen] = useState(false);
  const [deletingFuncionario, setDeletingFuncionario] = useState(null);
  const [isDeleteAlocModalOpen, setIsDeleteAlocModalOpen] = useState(false);
  const [deletingAlocacao, setDeletingAlocacao] = useState(null);

  // Estados de formulário
  const initialFuncForm = {
    nome: '',
    cargo: '',
    profissoes_ids: [],
    telefone: '',
    cpf: '',
    email: '',
    lider: false,
    cor: '',
    equipe_padrao_id: '',
    valor_diaria: '',
    ativo: true
  };
  const [funcForm, setFuncForm] = useState(initialFuncForm);

  const initialAlocForm = {
    obra_id: selectedObraId || '',
    funcionario_id: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    periodo: 'dia_inteiro',
    modalidade_pagamento: 'diaria',
    valor_diaria: '',
    valor_fechado: ''
  };
  const [alocForm, setAlocForm] = useState(initialAlocForm);

  const initialEquipeForm = {
    nome: '',
    lider_id: '',
    membros: []
  };
  const [equipeForm, setEquipeForm] = useState(initialEquipeForm);

  const initialPagamentoForm = {
    funcionario_id: '',
    obra_id: '',
    alocacao_id: '',
    modalidade: 'diaria',
    data_pagamento: new Date().toISOString().split('T')[0],
    valor_pago: ''
  };
  const [pagamentoForm, setPagamentoForm] = useState(initialPagamentoForm);

  const showToast = (message, type = 'success') => {
    let finalMessage = message;
    if (Array.isArray(message)) {
      finalMessage = message.map(m => m?.msg || JSON.stringify(m)).join(', ');
    }
    setToast({ message: finalMessage, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadFechamentoSemanal = async (ini, fim) => {
    setLoadingFechamento(true);
    try {
      const res = await api.get(`/calendario/fechamento-semanal?data_inicio=${ini}&data_fim=${fim}`);
      if (res.data) setFechamentoSemanal(res.data);
    } catch (err) {
      console.error('Erro ao carregar fechamento semanal:', err);
    } finally {
      setLoadingFechamento(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [funcRes, alocRes, equipesRes, pagRes, profRes, faltasRes, contratosRes] = await Promise.all([
        api.get('/calendario/funcionarios'),
        api.get(`/calendario/alocacoes${selectedObraId ? `?obra_id=${selectedObraId}` : ''}`),
        api.get('/calendario/equipes'),
        api.get('/calendario/pagamentos'),
        api.get('/calendario/profissoes'),
        api.get('/calendario/faltas'),
        api.get('/gestao/contratos')
      ]);
      if (funcRes.data) setFuncionarios(funcRes.data);
      if (alocRes.data) setAlocacoes(alocRes.data);
      if (equipesRes.data) setEquipes(equipesRes.data);
      if (pagRes.data) setPagamentos(pagRes.data);
      if (profRes.data) setProfissoes(profRes.data);
      if (faltasRes.data) setFaltas(faltasRes.data);
      if (contratosRes.data) setContratos(contratosRes.data);
      loadFechamentoSemanal(fechamentoInicio, fechamentoFim);
    } catch (err) {
      console.error('Erro ao carregar dados do calendário:', err);
      showToast('Erro ao carregar dados de equipe e alocações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedObraId]);

  const handleToggleFalta = async (funcionarioId, obraId, dataStr, motivo = 'Falta informada') => {
    try {
      const res = await api.post('/calendario/faltas/toggle', {
        funcionario_id: funcionarioId,
        obra_id: obraId,
        data: dataStr,
        motivo
      });
      if (res.data.status === 'created') {
        setFaltas(prev => [...prev, res.data.falta]);
        showToast('Falta registrada.', 'warning');
      } else {
        setFaltas(prev => prev.filter(f => !(f.funcionario_id === funcionarioId && f.data === dataStr)));
        showToast('Presença confirmada (falta removida).');
      }
      loadFechamentoSemanal(fechamentoInicio, fechamentoFim);
    } catch (err) {
      console.error('Erro ao alternar presença/falta:', err);
      showToast('Erro ao atualizar presença/falta.', 'error');
    }
  };

  const isFalta = (funcionarioId, dataStr) => {
    return faltas.some(f => f.funcionario_id === funcionarioId && f.data === dataStr);
  };

  const getLeaderColor = (aloc) => {
    const func = funcionarios.find(f => f.id === aloc.funcionario_id);
    if (func?.equipe_padrao_id) {
      const eq = equipes.find(e => e.id === func.equipe_padrao_id);
      if (eq?.lider_id) {
        const lider = funcionarios.find(f => f.id === eq.lider_id);
        if (lider?.cor) return lider.cor;
      }
    }
    if (func?.cor) return func.cor;
    if (aloc.funcionario_cor) return aloc.funcionario_cor;
    return null;
  };

  // ==========================================
  // HANDLERS: CATÁLOGO DE PROFISSÕES
  // ==========================================
  const isDuplicateProfissao = (nome, excludeId = null) => {
    const clean = (nome || '').trim().toLowerCase();
    if (!clean) return false;
    return profissoes.some(p => p.nome && p.nome.trim().toLowerCase() === clean && p.id !== excludeId);
  };

  const handleOpenNewProfissao = () => {
    setEditingProfissao(null);
    setProfissaoForm({ nome: '' });
    setShowProfissaoModal(true);
  };

  const handleOpenEditProfissao = (prof) => {
    setEditingProfissao(prof);
    setProfissaoForm({ nome: prof.nome || '' });
    setShowProfissaoModal(true);
  };

  const handleOpenDeleteProfissao = (prof) => {
    setDeletingProfissao(prof);
    setIsDeleteProfModalOpen(true);
  };

  const handleSaveProfissao = async (e) => {
    e.preventDefault();
    const nomeTrim = profissaoForm.nome.trim();
    if (!nomeTrim) {
      showToast('Informe o nome da profissão.', 'error');
      return;
    }
    if (isDuplicateProfissao(nomeTrim, editingProfissao?.id)) {
      showToast(`A profissão "${nomeTrim}" já está cadastrada no catálogo.`, 'error');
      return;
    }
    setSavingProfissao(true);
    try {
      if (editingProfissao) {
        await api.put(`/calendario/profissoes/${editingProfissao.id}`, { nome: nomeTrim });
        showToast(`Profissão "${nomeTrim}" atualizada com sucesso!`);
      } else {
        await api.post('/calendario/profissoes', { nome: nomeTrim });
        showToast(`Profissão "${nomeTrim}" adicionada ao catálogo!`);
      }
      setShowProfissaoModal(false);
      setEditingProfissao(null);
      setProfissaoForm({ nome: '' });
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar profissão:', err);
      let detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail = detail.map(d => d.msg).join(', ');
      }
      showToast(detail || 'Erro ao salvar profissão.', 'error');
    } finally {
      setSavingProfissao(false);
    }
  };

  const handleConfirmDeleteProfissao = async () => {
    if (!deletingProfissao) return;
    try {
      await api.delete(`/calendario/profissoes/${deletingProfissao.id}`);
      showToast(`Profissão "${deletingProfissao.nome}" removida do catálogo.`);
      setIsDeleteProfModalOpen(false);
      setDeletingProfissao(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir profissão:', err);
      const detail = err?.response?.data?.detail;
      showToast(detail || 'Erro ao excluir profissão.', 'error');
    }
  };

  // Abrir modal novo funcionário
  const handleOpenNewFuncionario = () => {
    setEditingFuncionario(null);
    setFuncForm(initialFuncForm);
    setModalType('funcionario');
    setShowModal(true);
  };

  // Abrir modal editar funcionário
  const handleOpenEditFuncionario = (func) => {
    setEditingFuncionario(func);
    const pIds = func.profissoes_ids || (func.profissoes ? func.profissoes.map(p => p.id) : []);
    setFuncForm({
      nome: func.nome || '',
      cargo: func.cargo || '',
      profissoes_ids: pIds,
      telefone: func.telefone ? formatTelefone(func.telefone) : '',
      cpf: func.cpf ? formatCPF(func.cpf) : '',
      email: func.email || '',
      lider: !!func.lider,
      cor: func.cor || '',
      equipe_padrao_id: func.equipe_padrao_id || '',
      valor_diaria: func.valor_diaria || '',
      ativo: func.ativo !== false
    });
    setModalType('funcionario');
    setShowModal(true);
  };

  // Abrir modal nova alocação pré-selecionando funcionário
  const handleOpenAlocacaoForFuncionario = (funcionarioId) => {
    setAlocForm({
      ...initialAlocForm,
      funcionario_id: funcionarioId,
      obra_id: obras && obras.length > 0 ? obras[0].id : ''
    });
    setModalType('alocacao');
    setShowModal(true);
  };

  // Salvar funcionário
  const handleSaveFuncionario = async (e) => {
    e.preventDefault();
    if (!funcForm.profissoes_ids || funcForm.profissoes_ids.length === 0) {
      showToast('Selecione ao menos um cargo/profissão do catálogo para o colaborador.', 'error');
      return;
    }
    try {
      const payload = { ...funcForm };
      // Clean up empty strings for optional fields
      if (!payload.equipe_padrao_id) delete payload.equipe_padrao_id;
      if (!payload.valor_diaria) delete payload.valor_diaria;
      if (!payload.cor) delete payload.cor;
      if (!payload.telefone) delete payload.telefone;
      if (!payload.cpf) delete payload.cpf;
      if (!payload.email) delete payload.email;

      // Mantém cargo preenchido para compatibilidade retroativa com RDO e relatórios
      if (!payload.cargo && payload.profissoes_ids.length > 0) {
        const nomesSel = profissoes.filter(p => payload.profissoes_ids.includes(p.id)).map(p => p.nome);
        payload.cargo = nomesSel.join(', ');
      }

      if (editingFuncionario) {
        await api.put(`/calendario/funcionarios/${editingFuncionario.id}`, payload);
        showToast(`Colaborador "${payload.nome}" atualizado com sucesso!`);
      } else {
        await api.post('/calendario/funcionarios', payload);
        showToast(`Colaborador "${payload.nome}" cadastrado com sucesso!`);
      }
      setShowModal(false);
      setEditingFuncionario(null);
      setFuncForm(initialFuncForm);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar funcionário:', err);
      let detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail = detail.map(d => d.msg).join(', ');
      }
      showToast(detail || 'Erro ao salvar colaborador.', 'error');
    }
  };

  // Confirmar exclusão de funcionário
  const handleConfirmDeleteFuncionario = async () => {
    if (!deletingFuncionario) return;
    try {
      await api.delete(`/calendario/funcionarios/${deletingFuncionario.id}`);
      showToast(`Colaborador "${deletingFuncionario.nome}" removido com sucesso.`);
      setIsDeleteFuncModalOpen(false);
      setDeletingFuncionario(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir funcionário:', err);
      const detail = err?.response?.data?.detail;
      showToast(detail || 'Erro ao excluir colaborador.', 'error');
    }
  };

  // Salvar alocação
  const handleSaveAlocacao = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...alocForm,
        valor_diaria: alocForm.valor_diaria !== '' && alocForm.valor_diaria !== null ? parseFloat(alocForm.valor_diaria) : null,
        valor_fechado: alocForm.valor_fechado !== '' && alocForm.valor_fechado !== null ? parseFloat(alocForm.valor_fechado) : null
      };

      const res = await api.post('/calendario/alocacoes', payload);
      if (res.data?.warning) {
        showToast(res.data.warning, 'warning');
      } else {
        showToast('Alocação registrada com sucesso!');
      }
      setShowModal(false);
      setAlocForm(initialAlocForm);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar alocação:', err);
      let detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail = detail.map(d => d.msg || d).join(', ');
      }
      showToast(detail || 'Erro ao registrar alocação.', 'error');
    }
  };

  const handleSaveEquipe = async (e) => {
    e.preventDefault();
    try {
      await api.post('/calendario/equipes', equipeForm);
      showToast('Equipe registrada com sucesso!');
      setShowModal(false);
      setEquipeForm(initialEquipeForm);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar equipe:', err);
      let detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail = detail.map(d => d.msg || d).join(', ');
      }
      showToast(detail || 'Erro ao registrar equipe.', 'error');
    }
  };

  const handleSavePagamento = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...pagamentoForm,
        valor_pago: parseFloat(pagamentoForm.valor_pago) || 0
      };
      if (!payload.alocacao_id) {
        payload.alocacao_id = null;
      }
      await api.post('/calendario/pagamentos', payload);
      showToast('Pagamento registrado com sucesso!');
      setShowModal(false);
      setPagamentoForm(initialPagamentoForm);
      
      api.get('/calendario/pagamentos').then(res => {
        if(res.data) setPagamentos(res.data);
      });
    } catch (err) {
      console.error('Erro ao salvar pagamento:', err);
      let detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail = detail.map(d => d.msg || d).join(', ');
      }
      showToast(detail || 'Erro ao registrar pagamento.', 'error');
    }
  };

  const handleConfirmDeleteEquipe = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta equipe?')) return;
    try {
      await api.delete(`/calendario/equipes/${id}`);
      showToast('Equipe removida com sucesso.');
      fetchData();
    } catch (err) {
      showToast('Erro ao excluir equipe.', 'error');
    }
  };

  const handleConfirmDeletePagamento = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este pagamento?')) return;
    try {
      await api.delete(`/calendario/pagamentos/${id}`);
      showToast('Pagamento removido com sucesso.');
      setPagamentos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      showToast('Erro ao excluir pagamento.', 'error');
    }
  };

  // Confirmar exclusão de alocação
  const handleConfirmDeleteAlocacao = async () => {
    if (!deletingAlocacao) return;
    try {
      await api.delete(`/calendario/alocacoes/${deletingAlocacao.id}`);
      showToast('Alocação removida com sucesso.');
      setIsDeleteAlocModalOpen(false);
      setDeletingAlocacao(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao remover alocação:', err);
      showToast('Erro ao remover alocação.', 'error');
    }
  };

  // Lista de cargos e especializações únicos para filtro
  const cargosDisponiveis = useMemo(() => {
    const setCargos = new Set();
    profissoes.forEach(p => {
      if (p.nome && p.nome.trim()) setCargos.add(p.nome.trim());
    });
    funcionarios.forEach(f => {
      if (f.cargo && f.cargo.trim()) setCargos.add(f.cargo.trim());
      if (f.profissoes && Array.isArray(f.profissoes)) {
        f.profissoes.forEach(p => {
          if (p.nome && p.nome.trim()) setCargos.add(p.nome.trim());
        });
      }
    });
    return Array.from(setCargos).sort((a, b) => a.localeCompare(b));
  }, [profissoes, funcionarios]);

  // Funcionários filtrados
  const funcionariosFiltrados = useMemo(() => {
    return funcionarios.filter(f => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch = !term || (
        (f.nome && f.nome.toLowerCase().includes(term)) ||
        (f.cargo && f.cargo.toLowerCase().includes(term)) ||
        (f.profissoes && f.profissoes.some(p => p.nome && p.nome.toLowerCase().includes(term))) ||
        (f.telefone && f.telefone.toLowerCase().includes(term)) ||
        (f.cpf && f.cpf.toLowerCase().includes(term)) ||
        (f.email && f.email.toLowerCase().includes(term))
      );

      const matchCargo = selectedCargo === 'todos' || 
        (f.cargo && f.cargo.toLowerCase() === selectedCargo.toLowerCase()) ||
        (f.profissoes && f.profissoes.some(p => p.nome && p.nome.toLowerCase() === selectedCargo.toLowerCase()));

      return matchSearch && matchCargo;
    });
  }, [funcionarios, searchTerm, selectedCargo]);

  // Profissões do catálogo filtradas
  const profissoesFiltradas = useMemo(() => {
    if (!profissaoSearchTerm.trim()) return profissoes;
    const term = profissaoSearchTerm.toLowerCase().trim();
    return profissoes.filter(p => p.nome && p.nome.toLowerCase().includes(term));
  }, [profissoes, profissaoSearchTerm]);

  // Alocações filtradas
  const alocacoesFiltradas = useMemo(() => {
    return alocacoes.filter(a => {
      const matchObra = filtroObra === 'todas' || String(a.obra_id) === String(filtroObra);
      const matchPeriodo = filtroPeriodo === 'todos' || a.periodo === filtroPeriodo;
      return matchObra && matchPeriodo;
    });
  }, [alocacoes, filtroObra, filtroPeriodo]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalFuncionarios = funcionarios.length;
    const funcionariosAtivos = funcionarios.filter(f => f.ativo !== false).length;
    const alocadosHoje = funcionarios.filter(f => f.alocacao_atual && f.alocacao_atual.em_andamento).length;
    const disponiveisHoje = Math.max(0, funcionariosAtivos - alocadosHoje);
    const obrasComEquipe = new Set(alocacoes.map(a => a.obra_id)).size;
    const totalProfissoes = profissoes.length;

    return {
      totalFuncionarios,
      funcionariosAtivos,
      alocadosHoje,
      disponiveisHoje,
      obrasComEquipe,
      totalProfissoes
    };
  }, [funcionarios, alocacoes, profissoes]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const conflitosAlocacao = useMemo(() => {
    if (!alocForm.funcionario_id || !alocForm.data_inicio || !alocForm.data_fim) return [];
    return alocacoes.filter(a => {
      if (a.funcionario_id !== alocForm.funcionario_id) return false;
      return a.data_inicio <= alocForm.data_fim && a.data_fim >= alocForm.data_inicio;
    });
  }, [alocForm.funcionario_id, alocForm.data_inicio, alocForm.data_fim, alocacoes]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-bounce-short ${
          toast.type === 'error' 
            ? 'bg-rose-950/90 border-rose-800 text-rose-200' 
            : toast.type === 'warning'
              ? 'bg-amber-950/90 border-amber-850 border-amber-600 text-amber-200'
              : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
        }`}>
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          ) : toast.type === 'warning' ? (
            <AlertCircle className="w-5 h-5 text-amber-400" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          )}
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
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Equipe Própria & Escalas
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users2 className="w-7 h-7 text-blue-400" />
            Equipe & Alocações
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Cadastro de colaboradores próprios (CLT) e alocações nas obras por turno.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={handleOpenNewFuncionario}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Colaborador</span>
          </button>

          <button 
            onClick={() => {
              setAlocForm({
                ...initialAlocForm,
                funcionario_id: funcionarios.length > 0 ? funcionarios[0].id : '',
                obra_id: obras.length > 0 ? obras[0].id : ''
              });
              setModalType('alocacao');
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Alocar em Obra</span>
          </button>
        </div>
      </div>

      {/* KPIs / Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Total Colaboradores</span>
            <Users2 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white tracking-tight">{stats.totalFuncionarios}</span>
            <span className="text-xs text-slate-400 block mt-0.5">{stats.funcionariosAtivos} ativos no quadro</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Alocados em Campo</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">{stats.alocadosHoje}</span>
            <span className="text-xs text-slate-400 block mt-0.5">com escala ativa hoje</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Disponíveis / Sem Obra</span>
            <UserX className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white tracking-tight">{stats.disponiveisHoje}</span>
            <span className="text-xs text-slate-400 block mt-0.5">prontos para alocação</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Obras com Equipe</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-purple-400 tracking-tight">{stats.obrasComEquipe}</span>
            <span className="text-xs text-slate-400 block mt-0.5">canteiros com escalas</span>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="border-b border-slate-800 flex items-center gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('funcionarios')}
          className={`flex items-center gap-2.5 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'funcionarios'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users2 className="w-4 h-4" />
          <span>Colaboradores & Equipe</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-normal">
            {funcionarios.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('profissoes')}
          className={`flex items-center gap-2.5 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'profissoes'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Catálogo de Profissões</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-normal">
            {profissoes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('alocacoes')}
          className={`flex items-center gap-2.5 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'alocacoes'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Lista de Alocações</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-normal">
            {alocacoes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('visao_mensal')}
          className={`flex items-center gap-2.5 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'visao_mensal'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Visão Mensal (Grade)</span>
        </button>

        <button
          onClick={() => setActiveTab('equipes')}
          className={`flex items-center gap-2.5 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'equipes'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Equipes Base</span>
        </button>

        <button
          onClick={() => setActiveTab('pagamentos')}
          className={`flex items-center gap-2.5 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'pagamentos'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Lançar Pagamentos</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: LISTAGEM DE COLABORADORES                         */}
      {/* ======================================================== */}
      {activeTab === 'funcionarios' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar colaborador por nome, cargo, telefone ou CPF..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
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

            {/* Filtro por Cargo */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedCargo}
                onChange={e => setSelectedCargo(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="todos">Todos os Cargos</option>
                {cargosDisponiveis.map(cargo => (
                  <option key={cargo} value={cargo}>{cargo}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid de Cards de Funcionários */}
          {loading ? (
            <div className="text-slate-400 py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400 mb-2"></div>
              <p className="text-sm">Carregando equipe...</p>
            </div>
          ) : funcionariosFiltrados.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-2xl p-12 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
                <Users2 className="w-7 h-7 text-blue-400/70" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-semibold text-white">Nenhum colaborador encontrado</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {searchTerm || selectedCargo !== 'todos'
                    ? 'Nenhum funcionário corresponde aos filtros de busca aplicados.'
                    : 'Cadastre os membros da sua equipe própria para gerenciar alocações nas obras.'}
                </p>
              </div>
              <button
                onClick={handleOpenNewFuncionario}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeiro Colaborador</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {funcionariosFiltrados.map((func) => {
                const cleanPhone = func.telefone ? func.telefone.replace(/\D/g, '') : '';
                const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;
                const initials = (func.nome || 'F')
                  .split(' ')
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const alocAtual = func.alocacao_atual;

                return (
                  <div 
                    key={func.id}
                    className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm hover:shadow-md"
                  >
                    <div>
                      {/* Topo do Card */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm tracking-wider">
                            {initials}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors leading-tight">
                              {func.nome}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {func.profissoes && func.profissoes.length > 0 ? (
                                func.profissoes.map(p => (
                                  <span key={p.id} className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                    {p.nome}
                                  </span>
                                ))
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  {func.cargo || 'Operacional'}
                                </span>
                              )}
                              {func.ativo === false ? (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-800 text-slate-400">
                                  Inativo
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-400">
                                  Ativo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditFuncionario(func)}
                            title="Editar Colaborador"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingFuncionario(func);
                              setIsDeleteFuncModalOpen(true);
                            }}
                            title="Excluir Colaborador"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Informações de Contato */}
                      <div className="space-y-1.5 text-xs text-slate-300 py-3 border-t border-slate-800/80 my-3">
                        {func.telefone ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-slate-400">
                              <Phone className="w-3.5 h-3.5 text-slate-500" />
                              <span>{func.telefone}</span>
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

                        {func.cpf && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                            <span>CPF: {func.cpf}</span>
                          </div>
                        )}

                        {func.email && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span className="truncate">{func.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Status de Alocação Atual */}
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Alocação Atual:
                        </span>
                        {alocAtual ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-emerald-400 flex items-center gap-1.5 truncate">
                                <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{alocAtual.obra_nome}</span>
                              </span>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                {alocAtual.periodo === 'dia_inteiro' ? 'Dia Inteiro' : alocAtual.periodo === 'manha' ? 'Manhã' : 'Tarde'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{formatDate(alocAtual.data_inicio)} até {formatDate(alocAtual.data_fim)}</span>
                              {alocAtual.em_andamento && (
                                <span className="ml-auto inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-500/20 text-emerald-300">
                                  Hoje
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-500 text-xs flex items-center gap-1.5 py-0.5">
                            <Clock className="w-3.5 h-3.5 text-slate-600" />
                            <span>Disponível / Sem alocação ativa</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botão de Rodapé para Alocar */}
                    <div className="pt-4">
                      <button
                        onClick={() => handleOpenAlocacaoForFuncionario(func.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer border border-slate-700/60"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-400" />
                        <span>Alocar {func.nome.split(' ')[0]} em Obra</span>
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
      {/* ABA: CATÁLOGO DE PROFISSÕES & ESPECIALIZAÇÕES           */}
      {/* ======================================================== */}
      {activeTab === 'profissoes' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca do Catálogo */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Padronização Oficial
                </span>
                <span className="text-xs text-slate-500">Seed Inicial de 15 Cargos</span>
              </div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber-400" />
                <span>Catálogo de Profissões da Construção Civil</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cargos e funções padrão para seleção estrita no cadastro de colaboradores. Impede duplicidades e erros de grafia.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={profissaoSearchTerm}
                  onChange={(e) => setProfissaoSearchTerm(e.target.value)}
                  placeholder="Buscar profissão no catálogo..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleOpenNewProfissao}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/10 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Profissão</span>
              </button>
            </div>
          </div>

          {/* Grid de Profissões */}
          {profissoesFiltradas.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center">
              <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-300">Nenhuma profissão encontrada</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {profissaoSearchTerm ? 'Nenhum cargo corresponde à sua busca.' : 'Nenhuma profissão cadastrada no catálogo mestre.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {profissoesFiltradas.map((prof) => (
                <div
                  key={prof.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 flex items-center justify-between gap-3 transition-all group shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                        {prof.nome}
                      </h4>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {prof.total_funcionarios || 0} colaborador{prof.total_funcionarios === 1 ? '' : 'es'} vinculado{prof.total_funcionarios === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditProfissao(prof)}
                      title="Editar Profissão"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteProfissao(prof)}
                      title="Excluir Profissão"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: LISTAGEM DE ALOCAÇÕES & ESCALAS                   */}
      {/* ======================================================== */}
      {activeTab === 'alocacoes' && (
        <div className="space-y-4">
          {/* Filtros da Grade de Alocações */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <label className="text-xs font-medium text-slate-400">Obra:</label>
                <select
                  value={filtroObra}
                  onChange={e => setFiltroObra(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="todas">Todas as Obras</option>
                  {obras?.map(o => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <label className="text-xs font-medium text-slate-400">Turno:</label>
                <select
                  value={filtroPeriodo}
                  onChange={e => setFiltroPeriodo(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="todos">Todos os Turnos</option>
                  <option value="dia_inteiro">Dia Inteiro</option>
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setAlocForm({
                  ...initialAlocForm,
                  funcionario_id: funcionarios.length > 0 ? funcionarios[0].id : '',
                  obra_id: obras.length > 0 ? obras[0].id : ''
                });
                setModalType('alocacao');
                setShowModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-lg transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Alocação</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="text-slate-400 py-10 col-span-2 text-center">Carregando alocações...</div>
            ) : alocacoesFiltradas.length === 0 ? (
              <div className="text-slate-500 py-12 col-span-2 text-center border border-slate-800 border-dashed rounded-2xl">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-400">Nenhuma alocação encontrada.</p>
                <p className="text-xs text-slate-500 mt-1">Aloque membros da equipe em obras para acompanhar as escalas.</p>
              </div>
            ) : (
              alocacoesFiltradas.map((aloc) => (
                <div 
                  key={aloc.id} 
                  className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex items-center justify-between transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                      {(aloc.funcionario_nome || 'F').split(' ').map((n, idx) => idx < 2 ? n[0] : '').join('')}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                        {aloc.funcionario_nome}
                      </h4>
                      {aloc.funcionario_cargo && (
                        <span className="text-[10px] text-slate-400 block">
                          {aloc.funcionario_cargo}
                        </span>
                      )}
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" /> 
                        <span>{formatDate(aloc.data_inicio)} até {formatDate(aloc.data_fim)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center justify-end gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{aloc.obra}</span>
                      </span>
                      <span className="text-[10px] text-slate-300 font-medium capitalize mt-1 px-2 py-0.5 rounded-full inline-block bg-slate-800 border border-slate-700/60">
                        {aloc.periodo === 'dia_inteiro' ? 'Dia Inteiro' : aloc.periodo === 'manha' ? 'Manhã' : 'Tarde'}
                      </span>
                      {aloc.created_by && (
                        <span className="block mt-2 text-[9px] text-slate-500 text-right">
                          Autorizado por {aloc.created_by === user?.id ? 'Você' : 'Guilherme/Sócio'}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setDeletingAlocacao(aloc);
                        setIsDeleteAlocModalOpen(true);
                      }}
                      title="Remover Alocação"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: VISÃO MENSAL (GRADE)                              */}
      {/* ======================================================== */}
      {activeTab === 'visao_mensal' && (
        <div className="space-y-4">
          {/* Barra de Controles: Navegação e Modos de Visualização */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
            {/* Navegação de Mês */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} 
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
              >
                Anterior
              </button>
              <h3 className="text-base font-bold text-white capitalize min-w-[140px] text-center">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h3>
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} 
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
              >
                Próximo
              </button>
            </div>

            {/* Switcher dos 3 Modos de Visualização */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setVisaoModo('geral')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    visaoModo === 'geral' 
                      ? 'bg-purple-600 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Visão Geral
                </button>
                <button
                  type="button"
                  onClick={() => setVisaoModo('por_obra')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    visaoModo === 'por_obra' 
                      ? 'bg-purple-600 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Por Obra
                </button>
                <button
                  type="button"
                  onClick={() => setVisaoModo('por_colaborador')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    visaoModo === 'por_colaborador' 
                      ? 'bg-purple-600 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Por Colaborador
                </button>
              </div>

              {/* Filtro específico quando modo = por_obra */}
              {visaoModo === 'por_obra' && (
                <select
                  value={visaoSelectedObra}
                  onChange={(e) => setVisaoSelectedObra(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">Todas as Obras</option>
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              )}

              {/* Filtro específico quando modo = por_colaborador */}
              {visaoModo === 'por_colaborador' && (
                <select
                  value={visaoSelectedColaborador}
                  onChange={(e) => setVisaoSelectedColaborador(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">Selecione o Colaborador...</option>
                  {funcionarios.map(f => (
                    <option key={f.id} value={f.id}>{f.nome} {f.cargo ? `(${f.cargo})` : ''}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Legenda Informativa */}
          <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-slate-950/40 border border-slate-800/60 rounded-xl text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
              <span>Colaborador Presente (cor do líder da equipe)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-rose-500/30 text-rose-300 border border-rose-500/40">FALTA</span>
              <span>Falta Registrada (clique p/ confirmar presença)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40">[Terceiro]</span>
              <span>Contrato de Terceiro em Execução</span>
            </div>
          </div>

          {/* Grade do Calendário */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/50">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="p-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider border-r border-slate-800/50 last:border-0">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr">
              {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, b) => (
                <div key={`blank-${b}`} className="min-h-[120px] p-2 border-b border-r border-slate-800/50 bg-slate-950/30"></div>
              ))}
              {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }).map((_, idx) => {
                const d = idx + 1;
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                
                // Filtro de alocações conforme modo selecionado
                const dayAlocs = alocacoes.filter(a => {
                  if (visaoModo === 'por_obra' && visaoSelectedObra && a.obra_id !== visaoSelectedObra) return false;
                  if (visaoModo === 'por_colaborador' && visaoSelectedColaborador && a.funcionario_id !== visaoSelectedColaborador) return false;
                  return a.data_inicio <= dateStr && a.data_fim >= dateStr;
                });

                // Filtro de terceiros ativos (visível no Geral e Por Obra)
                const dayContratos = visaoModo === 'por_colaborador' ? [] : contratos.filter(c => {
                  if (c.status !== 'ativo') return false;
                  if (visaoModo === 'por_obra' && visaoSelectedObra && c.obra_id !== visaoSelectedObra) return false;
                  const cIni = c.data_assinatura;
                  const cFim = c.data_termino;
                  if (cIni && cIni > dateStr) return false;
                  if (cFim && cFim < dateStr) return false;
                  return true;
                });

                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                
                const defaultColors = [
                  'bg-blue-500/20 text-blue-300 border-blue-500/30', 
                  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', 
                  'bg-purple-500/20 text-purple-300 border-purple-500/30', 
                  'bg-pink-500/20 text-pink-300 border-pink-500/30', 
                  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                ];
                const getHashColor = (name) => {
                  let hash = 0;
                  for (let i = 0; i < (name || '').length; i++) {
                    hash = name.charCodeAt(i) + ((hash << 5) - hash);
                  }
                  return defaultColors[Math.abs(hash) % defaultColors.length];
                };

                return (
                  <div key={d} className={`min-h-[120px] p-2 border-b border-r border-slate-800/50 hover:bg-slate-800/40 transition-colors ${isToday ? 'bg-emerald-950/20' : ''}`}>
                    <div className={`text-xs font-semibold mb-2 inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-slate-400'}`}>
                      {d}
                    </div>
                    <div className="space-y-1.5 h-full max-h-[105px] overflow-y-auto pr-1 custom-scrollbar">
                      {/* Colaboradores Escalados */}
                      {dayAlocs.map(a => {
                        const faltaAtiva = isFalta(a.funcionario_id, dateStr);
                        const leaderCol = getLeaderColor(a);

                        if (faltaAtiva) {
                          return (
                            <div 
                              key={a.id} 
                              onClick={() => handleToggleFalta(a.funcionario_id, a.obra_id, dateStr)}
                              className="px-2 py-1 text-[9px] leading-tight rounded border font-medium truncate shadow-sm cursor-pointer transition-all bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 flex items-center justify-between group"
                              title={`${a.funcionario_nome} - FALTA em ${a.obra}. Clique para confirmar presença.`}
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="px-1 py-0.2 rounded text-[7px] font-bold bg-rose-500/40 text-rose-100">FALTA</span>
                                <span className="font-bold line-through truncate">{a.funcionario_nome.split(' ')[0]}</span>
                              </div>
                              <UserCheck className="w-3 h-3 text-rose-400 group-hover:text-emerald-400 opacity-70 group-hover:opacity-100 flex-shrink-0" />
                            </div>
                          );
                        }

                        // Presença Normal
                        const customStyle = leaderCol ? {
                          backgroundColor: `${leaderCol}22`,
                          borderColor: `${leaderCol}55`,
                          color: '#f8fafc'
                        } : {};

                        return (
                          <div 
                            key={a.id} 
                            className={`px-2 py-1 text-[9px] leading-tight rounded border font-medium truncate shadow-sm transition-all hover:brightness-110 flex items-center justify-between group ${leaderCol ? '' : getHashColor(a.funcionario_nome)}`}
                            style={customStyle}
                            title={`${a.funcionario_nome} - ${a.obra} (${a.periodo})`}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              {leaderCol && (
                                <span 
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: leaderCol }} 
                                  title="Cor do líder da equipe"
                                />
                              )}
                              <span className="font-bold truncate">{a.funcionario_nome.split(' ')[0]}</span> 
                              <span className="opacity-75 truncate text-[8px]">em {a.obra}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFalta(a.funcionario_id, a.obra_id, dateStr);
                              }}
                              className="p-0.5 rounded hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0 cursor-pointer"
                              title="Marcar falta neste dia"
                            >
                              <UserX className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Terceiros em Execução */}
                      {dayContratos.map(c => (
                        <div 
                          key={`terceiro-${c.id}`} 
                          className="px-2 py-1 text-[9px] leading-tight rounded border font-medium truncate shadow-sm bg-amber-500/20 text-amber-300 border-amber-500/40 flex items-center gap-1"
                          title={`Contrato de Terceiro: ${c.empreiteiro_nome} - ${c.obra_nome || 'Obra'}`}
                        >
                          <span className="px-1 py-0.2 rounded text-[7px] font-bold bg-amber-500/40 text-amber-200">[Terceiro]</span>
                          <span className="font-bold truncate">{c.empreiteiro_nome}</span>
                          <span className="opacity-75 truncate text-[8px]">({c.obra_nome})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: LISTAGEM DE EQUIPES BASE                          */}
      {/* ======================================================== */}
      {activeTab === 'equipes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Equipes Cadastradas</h3>
            <button
              onClick={() => {
                setEquipeForm(initialEquipeForm);
                setModalType('equipe');
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Equipe</span>
            </button>
          </div>
          {loading ? (
            <div className="text-slate-400 py-8 text-center">Carregando equipes...</div>
          ) : equipes.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-2xl p-12 text-center text-slate-400">
              Nenhuma equipe cadastrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipes.map(eq => (
                <div key={eq.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: eq.funcionarios?.cor || '#6366f1' }}></div>
                      <h4 className="text-lg font-bold text-white">{eq.nome}</h4>
                    </div>
                    <p className="text-sm text-slate-400 font-semibold mb-2">Líder: <span style={{ color: eq.funcionarios?.cor || '#94a3b8' }}>{eq.funcionarios?.nome || 'Sem líder'}</span></p>
                    <div className="text-xs text-slate-400">
                      <span className="font-semibold block mb-1">Membros ({eq.membros?.length || 0}):</span>
                      {eq.membros && eq.membros.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {eq.membros.map(m => (
                            <span key={m.id} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                              {m.nome}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Nenhum membro vinculado.</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => handleConfirmDeleteEquipe(eq.id)} className="text-rose-400 hover:text-rose-300 p-2 bg-rose-500/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 5: LANÇAMENTO DE PAGAMENTOS E FECHAMENTO SEMANAL    */}
      {/* ======================================================== */}
      {activeTab === 'pagamentos' && (
        <div className="space-y-6">
          {/* Card: Fechamento Semanal de Equipe */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Fechamento Semanal de Equipe</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Cálculo automático de diárias com desconto de faltas e acompanhamento de saldo de valor fechado.
                </p>
              </div>

              {/* Filtro de Período do Fechamento */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-semibold">De:</span>
                  <input
                    type="date"
                    value={fechamentoInicio}
                    onChange={e => setFechamentoInicio(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400 font-semibold ml-1">Até:</span>
                  <input
                    type="date"
                    value={fechamentoFim}
                    onChange={e => setFechamentoFim(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => loadFechamentoSemanal(fechamentoInicio, fechamentoFim)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
                >
                  Recalcular
                </button>
              </div>
            </div>

            {/* KPIs Resumo do Fechamento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Colaboradores Escalados</p>
                <p className="text-lg font-bold text-white mt-0.5">{fechamentoSemanal.length}</p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Faltas no Período</p>
                <p className={`text-lg font-bold mt-0.5 ${fechamentoSemanal.reduce((acc, i) => acc + (i.dias_faltas || 0), 0) > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {fechamentoSemanal.reduce((acc, i) => acc + (i.dias_faltas || 0), 0)}
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Dias Trabalhados</p>
                <p className="text-lg font-bold text-blue-400 mt-0.5">
                  {fechamentoSemanal.reduce((acc, i) => acc + (i.dias_trabalhados || 0), 0)}
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Calculado a Pagar</p>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    fechamentoSemanal.reduce((acc, i) => acc + (i.valor_sugerido || 0), 0)
                  )}
                </p>
              </div>
            </div>

            {/* Tabela do Fechamento Semanal */}
            {loadingFechamento ? (
              <div className="py-8 text-center text-slate-400 text-sm">Calculando fechamento semanal...</div>
            ) : fechamentoSemanal.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800/80 border-dashed rounded-xl p-8 text-center text-slate-400 text-xs">
                Nenhum colaborador com alocação ativa no período selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-[11px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3">Obra</th>
                      <th className="px-4 py-3">Modalidade</th>
                      <th className="px-4 py-3 text-center">Escalados</th>
                      <th className="px-4 py-3 text-center">Faltas</th>
                      <th className="px-4 py-3 text-center">Efetivos</th>
                      <th className="px-4 py-3">Cálculo / Saldo</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                    {fechamentoSemanal.map(item => (
                      <tr key={item.alocacao_id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-white block">{item.funcionario_nome}</span>
                          {item.funcionario_cargo && (
                            <span className="text-[10px] text-slate-400">{item.funcionario_cargo}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-300">{item.obra_nome}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            item.modalidade === 'diaria' 
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}>
                            {item.modalidade === 'diaria' ? 'Diária' : 'Fechado'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-300">
                          {item.dias_escalados}d
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.dias_faltas > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              -{item.dias_faltas}d
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-400">
                          {item.dias_trabalhados}d
                        </td>
                        <td className="px-4 py-3">
                          {item.modalidade === 'diaria' ? (
                            <div className="space-y-0.5">
                              <span className="text-[11px] text-slate-400">
                                {item.dias_trabalhados}d × {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_diaria)}
                              </span>
                              <div className="font-bold text-emerald-400 text-sm">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_sugerido)}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-400 block">
                                Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_fechado_total)} | Pago: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_pago)}
                              </span>
                              <div className="text-xs">
                                Saldo: <strong className="text-amber-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.saldo_restante)}</strong>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setPagamentoForm({
                                funcionario_id: item.funcionario_id,
                                obra_id: item.obra_id,
                                alocacao_id: item.alocacao_id,
                                modalidade: item.modalidade,
                                data_pagamento: new Date().toISOString().split('T')[0],
                                valor_pago: item.valor_sugerido > 0 ? String(item.valor_sugerido) : ''
                              });
                              setModalType('pagamento');
                              setShowModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-all cursor-pointer"
                            title="Lançar pagamento deste fechamento"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pagar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Histórico de Lançamentos de Pagamento */}
          <div className="flex justify-between items-center pt-2">
            <h3 className="text-lg font-bold text-white">Histórico de Pagamentos Lançados (Caixa Pequeno)</h3>
            <button
              onClick={() => {
                setPagamentoForm(initialPagamentoForm);
                setModalType('pagamento');
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Lançar Pagamento Avulso</span>
            </button>
          </div>
          {loading ? (
            <div className="text-slate-400 py-8 text-center">Carregando pagamentos...</div>
          ) : pagamentos.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-2xl p-12 text-center text-slate-400">
              Nenhum pagamento registrado.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/50 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Funcionário</th>
                    <th className="px-6 py-4">Modalidade</th>
                    <th className="px-6 py-4">Valor Pago</th>
                    <th className="px-6 py-4">Responsável</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {pagamentos.map(pag => (
                    <tr key={pag.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(pag.data_pagamento)}</td>
                      <td className="px-6 py-4 font-medium text-white">{pag.funcionarios?.nome}</td>
                      <td className="px-6 py-4 capitalize">{pag.modalidade}</td>
                      <td className="px-6 py-4 text-emerald-400 font-semibold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pag.valor_pago)}
                      </td>
                      <td className="px-6 py-4 text-[10px] text-slate-400">
                        {pag.created_by ? (pag.created_by === user?.id ? 'Você' : 'Sócio') : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleConfirmDeletePagamento(pag.id)} className="text-rose-400 hover:text-rose-300 p-1.5 bg-rose-500/10 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVO / EDITAR FUNCIONÁRIO                         */}
      {/* ======================================================== */}
      {showModal && modalType === 'funcionario' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users2 className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">
                  {editingFuncionario ? `Editar Colaborador — ${editingFuncionario.nome}` : 'Cadastrar Novo Colaborador'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[75vh]">
              <form id="func-form" onSubmit={handleSaveFuncionario} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={funcForm.nome}
                    onChange={e => setFuncForm({...funcForm, nome: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Seleção Estrita por Lista do Catálogo de Profissões (N:N) */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-amber-400" />
                      <span>Cargos & Especializações *</span>
                      <span className="text-[10px] text-amber-400 font-normal">(Catálogo Obrigatório)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setActiveTab('profissoes');
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Gerenciar Catálogo
                    </button>
                  </div>

                  {/* Dropdown estrito sem digitação livre */}
                  <select
                    value=""
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      if (!funcForm.profissoes_ids.includes(selectedId)) {
                        const updated = [...funcForm.profissoes_ids, selectedId];
                        const profObj = profissoes.find(p => p.id === selectedId);
                        setFuncForm({
                          ...funcForm,
                          profissoes_ids: updated,
                          cargo: funcForm.cargo || (profObj ? profObj.nome : '')
                        });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">+ Selecionar cargo/especialização do catálogo...</option>
                    {profissoes
                      .filter(p => !funcForm.profissoes_ids.includes(p.id))
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                  </select>

                  {/* Badges das especializações selecionadas */}
                  {funcForm.profissoes_ids && funcForm.profissoes_ids.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {funcForm.profissoes_ids.map(pid => {
                        const profObj = profissoes.find(p => p.id === pid);
                        const profNome = profObj ? profObj.nome : (editingFuncionario?.cargo || 'Profissão');
                        const isPrimary = (funcForm.cargo === profNome) || (funcForm.profissoes_ids.length === 1);

                        return (
                          <span
                            key={pid}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                              isPrimary
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm'
                                : 'bg-slate-800/80 text-slate-300 border-slate-700'
                            }`}
                          >
                            <span>{profNome}</span>
                            {isPrimary ? (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider">
                                Principal
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setFuncForm({...funcForm, cargo: profNome})}
                                className="text-[10px] text-slate-400 hover:text-amber-300 underline cursor-pointer"
                                title="Definir como especialização principal"
                              >
                                tornar principal
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = funcForm.profissoes_ids.filter(id => id !== pid);
                                let newCargo = funcForm.cargo;
                                if (funcForm.cargo === profNome) {
                                  const remaining = profissoes.find(p => updated.includes(p.id));
                                  newCargo = remaining ? remaining.nome : '';
                                }
                                setFuncForm({
                                  ...funcForm,
                                  profissoes_ids: updated,
                                  cargo: newCargo
                                });
                              }}
                              className="text-slate-400 hover:text-rose-400 ml-1 cursor-pointer"
                              title="Remover especialização"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1 pt-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Selecione ao menos um cargo do catálogo acima. Digitação livre desativada.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="(47) 99999-9999"
                      value={funcForm.telefone}
                      maxLength={15}
                      onChange={e => setFuncForm({...funcForm, telefone: formatTelefone(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">CPF</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={funcForm.cpf}
                      maxLength={14}
                      onChange={e => setFuncForm({...funcForm, cpf: formatCPF(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">E-mail</label>
                  <input
                    type="email"
                    placeholder="joao@exemplo.com"
                    value={funcForm.email}
                    onChange={e => setFuncForm({...funcForm, email: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Valor da Diária (R$)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={funcForm.valor_diaria}
                      onChange={e => setFuncForm({...funcForm, valor_diaria: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-col justify-center pt-5">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={funcForm.lider}
                        onChange={e => setFuncForm({...funcForm, lider: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>É Líder de Equipe?</span>
                    </label>
                  </div>
                </div>

                {funcForm.lider && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Cor no Calendário (Para Líderes)</label>
                    <select
                      value={funcForm.cor}
                      onChange={e => setFuncForm({...funcForm, cor: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Selecione uma cor...</option>
                      <option value="bg-blue-500">Azul</option>
                      <option value="bg-emerald-500">Verde</option>
                      <option value="bg-rose-500">Vermelho</option>
                      <option value="bg-amber-500">Amarelo</option>
                      <option value="bg-purple-500">Roxo</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={funcForm.ativo}
                      onChange={e => setFuncForm({...funcForm, ativo: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Colaborador Ativo na Empresa</span>
                  </label>
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/30">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="func-form"
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all"
              >
                {editingFuncionario ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVA ALOCAÇÃO                                     */}
      {/* ======================================================== */}
      {showModal && modalType === 'alocacao' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Alocar Colaborador em Obra</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <form id="aloc-form" onSubmit={handleSaveAlocacao} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Colaborador *</label>
                  <select
                    required
                    value={alocForm.funcionario_id}
                    onChange={e => setAlocForm({...alocForm, funcionario_id: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecione o colaborador...</option>
                    {funcionarios.map(f => (
                      <option key={f.id} value={f.id}>{f.nome} {f.cargo ? `(${f.cargo})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Obra de Destino *</label>
                  <select
                    required
                    value={alocForm.obra_id}
                    onChange={e => setAlocForm({...alocForm, obra_id: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecione a obra...</option>
                    {obras.map(o => (
                      <option key={o.id} value={o.id}>{o.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Data Início *</label>
                    <input
                      type="date"
                      required
                      value={alocForm.data_inicio}
                      onChange={e => setAlocForm({...alocForm, data_inicio: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Data Fim *</label>
                    <input
                      type="date"
                      required
                      value={alocForm.data_fim}
                      onChange={e => setAlocForm({...alocForm, data_fim: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Alerta Não-Bloqueante de Conflito de Alocação */}
                {conflitosAlocacao.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-300">Aviso: Conflito de Alocação Detectado</p>
                      <p className="text-amber-200/80 text-[11px]">
                        Este colaborador já possui {conflitosAlocacao.length} escala(s) no período informado:
                      </p>
                      <div className="space-y-1 mt-1">
                        {conflitosAlocacao.map(c => (
                          <div key={c.id} className="text-[10px] bg-slate-950/60 px-2 py-1 rounded border border-amber-500/20 text-slate-300">
                            • <strong className="text-white">{c.obra}</strong> ({formatDate(c.data_inicio)} a {formatDate(c.data_fim)} — {c.periodo === 'dia_inteiro' ? 'Dia Inteiro' : c.periodo})
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-amber-400/90 italic pt-0.5">
                        * A gravação é permitida normalmente, servindo apenas como aviso de sobreposição de obras.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Turno / Período</label>
                  <select
                    value={alocForm.periodo}
                    onChange={e => setAlocForm({...alocForm, periodo: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="dia_inteiro">Dia Inteiro (Integral)</option>
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Modalidade de Pagamento *</label>
                  <select
                    required
                    value={alocForm.modalidade_pagamento}
                    onChange={e => setAlocForm({...alocForm, modalidade_pagamento: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="diaria">Por Diária</option>
                    <option value="fechado">Valor Fechado (Empreita)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {alocForm.modalidade_pagamento === 'diaria' && (
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Valor da Diária (R$)</label>
                      <input
                        type="number"
                        placeholder="Ex: 150.00"
                        value={alocForm.valor_diaria}
                        onChange={e => setAlocForm({...alocForm, valor_diaria: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Deixe em branco para usar o valor cadastrado do funcionário.</p>
                    </div>
                  )}

                  {alocForm.modalidade_pagamento === 'fechado' && (
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Valor Fechado Total (R$)</label>
                      <input
                        type="number"
                        required
                        placeholder="Ex: 5000.00"
                        value={alocForm.valor_fechado}
                        onChange={e => setAlocForm({...alocForm, valor_fechado: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/30">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="aloc-form"
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-all"
              >
                Confirmar Alocação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE FUNCIONÁRIO                 */}
      {/* ======================================================== */}
      {isDeleteFuncModalOpen && deletingFuncionario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Excluir Colaborador?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Tem certeza que deseja remover o colaborador <strong className="text-white">"{deletingFuncionario.nome}"</strong>?
              </p>
              {deletingFuncionario.total_alocacoes > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>As alocações vinculadas a este colaborador também serão removidas do calendário.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsDeleteFuncModalOpen(false);
                  setDeletingFuncionario(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteFuncionario}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-lg transition-all"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE ALOCAÇÃO                    */}
      {/* ======================================================== */}
      {isDeleteAlocModalOpen && deletingAlocacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Remover Alocação?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Deseja remover a alocação de <strong className="text-white">"{deletingAlocacao.funcionario_nome}"</strong> na obra <strong className="text-white">"{deletingAlocacao.obra}"</strong>?
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsDeleteAlocModalOpen(false);
                  setDeletingAlocacao(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteAlocacao}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-lg transition-all"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVA EQUIPE                                         */}
      {/* ======================================================== */}
      {showModal && modalType === 'equipe' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Cadastrar Equipe</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <form id="equipe-form" onSubmit={handleSaveEquipe} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Nome da Equipe *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Equipe Alpha"
                    value={equipeForm.nome}
                    onChange={e => setEquipeForm({...equipeForm, nome: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Líder da Equipe</label>
                  <select
                    value={equipeForm.lider_id}
                    onChange={e => setEquipeForm({...equipeForm, lider_id: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Nenhum (Sem Líder)</option>
                    {funcionarios.filter(f => f.lider).map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Membros da Equipe</label>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                    {funcionarios.filter(f => !f.lider).map(f => (
                      <label key={f.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={equipeForm.membros.includes(f.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEquipeForm({...equipeForm, membros: [...equipeForm.membros, f.id]});
                            } else {
                              setEquipeForm({...equipeForm, membros: equipeForm.membros.filter(id => id !== f.id)});
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                        />
                        {f.nome}
                      </label>
                    ))}
                    {funcionarios.filter(f => !f.lider).length === 0 && (
                      <p className="text-xs text-slate-500 text-center">Nenhum colaborador disponível.</p>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/30">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="equipe-form"
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all"
              >
                Salvar Equipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVO PAGAMENTO                                      */}
      {/* ======================================================== */}
      {showModal && modalType === 'pagamento' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Lançar Pagamento</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="pagamento-form" onSubmit={handleSavePagamento} className="flex flex-col">
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Funcionário *</label>
                  <select
                    required
                    value={pagamentoForm.funcionario_id}
                    onChange={e => setPagamentoForm({...pagamentoForm, funcionario_id: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Selecione o funcionário...</option>
                    {funcionarios.map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Obra Relacionada *</label>
                  <select
                    required
                    value={pagamentoForm.obra_id}
                    onChange={e => setPagamentoForm({...pagamentoForm, obra_id: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Selecione a obra...</option>
                    {obras.map(o => (
                      <option key={o.id} value={o.id}>{o.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Data do Pagamento *</label>
                    <input
                      type="date"
                      required
                      value={pagamentoForm.data_pagamento}
                      onChange={e => setPagamentoForm({...pagamentoForm, data_pagamento: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Modalidade *</label>
                    <select
                      required
                      value={pagamentoForm.modalidade}
                      onChange={e => setPagamentoForm({...pagamentoForm, modalidade: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="diaria">Por Diária</option>
                      <option value="fechado">Fechado/Empreita</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Valor Total a Pagar (R$) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="Ex: 850.00"
                    value={pagamentoForm.valor_pago}
                    onChange={e => setPagamentoForm({...pagamentoForm, valor_pago: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-emerald-400 font-bold focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Este valor será lançado automaticamente como despesa de Mão de Obra Própria no Caixa Pequeno da obra selecionada.</p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/30">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-all"
                >
                  Lançar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVA / EDITAR PROFISSÃO DO CATÁLOGO                */}
      {/* ======================================================== */}
      {showProfissaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {editingProfissao ? `Editar Profissão` : 'Nova Profissão no Catálogo'}
                </h3>
              </div>
              <button 
                onClick={() => setShowProfissaoModal(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfissao} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Nome do Cargo / Profissão *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Mestre de Obras, Pedreiro, Eletricista..."
                  value={profissaoForm.nome}
                  onChange={(e) => setProfissaoForm({ ...profissaoForm, nome: e.target.value })}
                  className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all ${
                    isDuplicateProfissao(profissaoForm.nome, editingProfissao?.id)
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-800 focus:border-amber-500'
                  }`}
                />
                {isDuplicateProfissao(profissaoForm.nome, editingProfissao?.id) ? (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Esta profissão já existe no catálogo (validação case-insensitive).
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Validação única sem distinção de maiúsculas/minúsculas para evitar repetições e erros de grafia.
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowProfissaoModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProfissao || !profissaoForm.nome.trim() || isDuplicateProfissao(profissaoForm.nome, editingProfissao?.id)}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {savingProfissao ? 'Salvando...' : editingProfissao ? 'Atualizar Profissão' : 'Cadastrar no Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EXCLUSÃO DE PROFISSÃO DO CATÁLOGO                  */}
      {/* ======================================================== */}
      {isDeleteProfModalOpen && deletingProfissao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Excluir Profissão do Catálogo?</h3>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              Deseja remover <strong className="text-white">"{deletingProfissao.nome}"</strong> do catálogo padronizado?
            </p>
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 mb-6 leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Integridade Referencial:</strong>
                O vínculo com os {deletingProfissao.total_funcionarios || 0} colaborador(es) será desfeito com total segurança, <strong>sem apagar</strong> os colaboradores do sistema.
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteProfModalOpen(false);
                  setDeletingProfissao(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteProfissao}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-all cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

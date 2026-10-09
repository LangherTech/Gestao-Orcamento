import React, { useState, useMemo } from 'react';
import {
  Building2, Plus, Calendar, MapPin, DollarSign, ArrowUpRight,
  X, AlertCircle, CheckCircle2, RotateCcw, Archive, ArchiveRestore,
  Search, Edit3, Trash2, Check, Clock, Filter, Map as MapIcon, List
} from 'lucide-react';
import api from '../services/api';
import { searchAddress } from '../services/geoapify';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function ObrasPage({ obras = [], onSelectObra, onRefresh }) {
  // View mode
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'

  // Estados de busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ativas'); // 'ativas', 'concluidas', 'arquivadas', 'todas'

  // Modais e edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingObra, setEditingObra] = useState(null);
  const [deletingObra, setDeletingObra] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Autocomplete de Endereço
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    cliente: '',
    endereco: '',
    data_inicio: '',
    data_prevista_fim: '',
    data_real_fim: '',

    valor_aprovado: '',
    status: 'ativa',
    arquivada: false,
    latitude: null,
    longitude: null
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const formatMoney = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Contadores para as abas
  const counts = useMemo(() => {
    const ativas = obras.filter(o => !o.arquivada && o.status === 'ativa').length;
    const concluidas = obras.filter(o => !o.arquivada && o.status === 'concluida').length;
    const arquivadas = obras.filter(o => o.arquivada).length;
    const todas = obras.length;
    return { ativas, concluidas, arquivadas, todas };
  }, [obras]);

  // Filtragem com a REGRA CRÍTICA DE BUSCA do Notion:
  // "A pesquisa por texto (nome da obra, cliente, etc.) SEMPRE retorna a obra, esteja ela arquivada ou não."
  const filteredObras = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return obras.filter(obra => {
      // Se houver busca por texto: busca global sobre todas as obras
      if (term) {
        const matchText = (
          (obra.nome || '').toLowerCase().includes(term) ||
          (obra.cliente || '').toLowerCase().includes(term) ||
          (obra.endereco || '').toLowerCase().includes(term)
        );
        if (!matchText) return false;

        // Se o usuário selecionou uma aba específica enquanto busca, pode filtrar ou exibir
        if (activeTab === 'ativas') return obra.status === 'ativa' && !obra.arquivada;
        if (activeTab === 'concluidas') return obra.status === 'concluida' && !obra.arquivada;
        if (activeTab === 'arquivadas') return obra.arquivada;
        return true; // 'todas'
      }

      // Sem busca: aplica a listagem padrão por abas
      if (activeTab === 'ativas') {
        return !obra.arquivada && obra.status === 'ativa';
      }
      if (activeTab === 'concluidas') {
        return !obra.arquivada && obra.status === 'concluida';
      }
      if (activeTab === 'arquivadas') {
        return Boolean(obra.arquivada);
      }
      return true; // 'todas'
    });
  }, [obras, searchTerm, activeTab]);

  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'endereco') {
      if (value.length > 3) {
        setIsSearchingAddress(true);
        setShowSuggestions(true);
        const results = await searchAddress(value);
        setAddressSuggestions(results);
        setIsSearchingAddress(false);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  const handleSelectAddress = (feature) => {
    setFormData(prev => ({
      ...prev,
      endereco: feature.properties.formatted,
      latitude: feature.properties.lat,
      longitude: feature.properties.lon
    }));
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  const handleOpenCreateModal = () => {
    setEditingObra(null);
    setFormData({
      nome: '',
      cliente: '',
      endereco: '',
      data_inicio: '',
      data_prevista_fim: '',
      data_real_fim: '',

      valor_aprovado: '',
      status: 'ativa',
      arquivada: false,
      latitude: null,
      longitude: null
    });
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (obra) => {
    setEditingObra(obra);
    setFormData({
      nome: obra.nome || '',
      cliente: obra.cliente || '',
      endereco: obra.endereco || '',
      data_inicio: obra.data_inicio || '',
      data_prevista_fim: obra.data_prevista_fim || '',
      data_real_fim: obra.data_real_fim || '',

      valor_aprovado: obra.valor_aprovado || '',
      status: obra.status || 'ativa',
      arquivada: Boolean(obra.arquivada),
      latitude: obra.latitude || null,
      longitude: obra.longitude || null
    });
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,

        valor_aprovado: parseFloat(String(formData.valor_aprovado || 0).replace(',', '.')) || 0,
        data_inicio: formData.data_inicio || null,
        data_prevista_fim: formData.data_prevista_fim || null,
        data_real_fim: formData.data_real_fim || null,
        latitude: formData.latitude,
        longitude: formData.longitude
      };

      if (editingObra) {
        await api.put(`/obras/${editingObra.id}`, payload);
        showToast('Obra atualizada com sucesso!');
      } else {
        await api.post('/obras', payload);
        showToast('Nova obra cadastrada com sucesso!');
      }

      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Erro ao salvar a obra. Verifique os dados.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // AÇÃO RÁPIDA: Alternar Status entre Ativa e Concluída
  const handleToggleStatus = async (obra) => {
    const nextStatus = obra.status === 'ativa' ? 'concluida' : 'ativa';
    try {
      await api.patch(`/obras/${obra.id}/status`, { status: nextStatus });
      showToast(
        nextStatus === 'concluida' 
          ? `Obra "${obra.nome}" marcada como Concluída!` 
          : `Obra "${obra.nome}" reaberta como Ativa!`
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao alternar status da obra', err);
      showToast('Erro ao alternar status da obra.', 'error');
    }
  };

  // AÇÃO RÁPIDA: Alternar Arquivamento (1 clique)
  const handleToggleArquivar = async (obra) => {
    try {
      const res = await api.patch(`/obras/${obra.id}/arquivar`, {});
      const nowArchived = res.data?.arquivada;
      showToast(
        nowArchived 
          ? `Obra "${obra.nome}" arquivada com sucesso!` 
          : `Obra "${obra.nome}" desarquivada com sucesso!`
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao alternar arquivamento da obra', err);
      showToast('Erro ao alterar arquivamento.', 'error');
    }
  };

  // Excluir Obra
  const handleDeleteObra = async () => {
    if (!deletingObra) return;
    try {
      await api.delete(`/obras/${deletingObra.id}`);
      showToast(`Obra "${deletingObra.nome}" excluída.`);
      setDeletingObra(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao excluir obra', err);
      showToast('Erro ao excluir obra. Verifique dependências vinculadas.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl animate-in fade-in slide-in-from-bottom-2 ${
          toast.type === 'error'
            ? 'bg-red-500/20 border-red-500/40 text-red-300'
            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-emerald-400" />
            <span>Obras & Projetos</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Gerenciamento dos canteiros, contratos, arquivamento visual e status de execução.
          </p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all w-fit cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Obra</span>
        </button>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80">
        {/* Input de Busca Global */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome da obra, cliente ou endereço (pesquisa global)..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-9 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Abas Rápidas de Exibição */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ativas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ativas'
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>Ativas</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'ativas' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {counts.ativas}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('concluidas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'concluidas'
                ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>Concluídas</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'concluidas' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {counts.concluidas}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('arquivadas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'arquivadas'
                ? 'bg-amber-500/90 text-white shadow-sm shadow-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Archive className="w-3 h-3" />
            <span>Arquivadas</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'arquivadas' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {counts.arquivadas}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('todas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'todas'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>Todas</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'todas' ? 'bg-slate-800 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {counts.todas}
            </span>
          </button>
        </div>
        {/* View Toggle */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 shrink-0 ml-2">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Lista</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'map'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Mapa</span>
          </button>
        </div>
      </div>

      {/* Indicador de busca ativa */}
      {searchTerm && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Exibindo resultados para "<strong className="text-white">{searchTerm}</strong>" em pesquisa global:
          </span>
          <button
            onClick={() => setSearchTerm('')}
            className="text-emerald-400 hover:underline cursor-pointer"
          >
            Limpar filtro de busca
          </button>
        </div>
      )}

      {/* Visualização de Obras */}
      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredObras.map((obra) => {
            const isAtiva = obra.status === 'ativa';
            const isArquivada = Boolean(obra.arquivada);
            const valorAprovadoCalc = (obra.orcamentos && obra.orcamentos.length > 0)
              ? obra.orcamentos.filter(o => o.status === 'aprovado').reduce((acc, o) => acc + Number(o.valor_total || 0), 0)
              : Number(obra.valor_aprovado || 0);
            const valorPendenteCalc = (obra.orcamentos && obra.orcamentos.length > 0)
              ? obra.orcamentos.filter(o => o.status === 'rascunho' || o.status === 'enviado').reduce((acc, o) => acc + Number(o.valor_total || 0), 0)
              : Number(obra.valor_pendente_aprovacao || 0);

            return (
              <div 
                key={obra.id} 
                className={`glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between transition-all duration-200 border ${
                  isArquivada
                    ? 'border-amber-500/20 bg-slate-900/40 opacity-90'
                    : isAtiva
                    ? 'border-slate-800/80 hover:border-emerald-500/30'
                    : 'border-slate-800/80 hover:border-blue-500/30'
                }`}
              >
                <div>
                  {/* Header do Card com Badges e Ações de Topo */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {/* Badge de Status (Ativa / Concluída) */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isAtiva 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isAtiva ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
                          {isAtiva ? 'Ativa' : 'Concluída'}
                        </span>

                        {/* Badge Arquivada (quando aplicável) */}
                        {isArquivada && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Archive className="w-3 h-3" />
                            <span>Arquivada</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-white truncate" title={obra.nome}>
                        {obra.nome}
                      </h3>
                      <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                        Cliente: {obra.cliente || 'Não informado'}
                      </p>
                    </div>

                    {/* Botões de Ações Rápidas (Editar / Excluir) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(obra)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Editar Obra"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingObra(obra)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Excluir Obra"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Endereço */}
                  {obra.endereco && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{obra.endereco}</span>
                    </div>
                  )}

                  {/* Datas de Início / Término */}
                  {(obra.data_inicio || obra.data_prevista_fim || obra.data_real_fim) && (
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 mb-3 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800/50">
                      {obra.data_inicio && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Início:</span>
                          <span className="text-slate-200 font-medium">{formatDate(obra.data_inicio)}</span>
                        </div>
                      )}
                      {obra.status === 'concluida' && obra.data_real_fim ? (
                        <div className="flex items-center gap-1">
                          <span className="text-blue-400">Concluída em:</span>
                          <span className="text-white font-medium">{formatDate(obra.data_real_fim)}</span>
                        </div>
                      ) : obra.data_prevista_fim ? (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Previsão:</span>
                          <span className="text-slate-200 font-medium">{formatDate(obra.data_prevista_fim)}</span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Resumo Financeiro */}
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Orçamento Aprovado:</span>
                      <span className="font-bold text-white">{formatMoney(valorAprovadoCalc)}</span>
                    </div>
                    {valorPendenteCalc > 0 && (
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-amber-400/80">Pendente de Aprovação:</span>
                        <span className="font-bold text-amber-400">{formatMoney(valorPendenteCalc)}</span>
                      </div>
                    )}

                  </div>
                </div>

                {/* Botões de Ações Rápidas (Concluir/Reabrir, Arquivar/Desarquivar e Acessar) */}
                <div className="space-y-2 pt-1 border-t border-slate-800/60">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Botão Rápido de Status (Concluir / Reabrir) */}
                    <button
                      onClick={() => handleToggleStatus(obra)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isAtiva
                          ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                      title={isAtiva ? 'Marcar obra como concluída' : 'Reverter para obra ativa'}
                    >
                      {isAtiva ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                          <span>Concluir Obra</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Reabrir Obra</span>
                        </>
                      )}
                    </button>

                    {/* Botão Rápido de Arquivar / Desarquivar (1 clique) */}
                    <button
                      onClick={() => handleToggleArquivar(obra)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isArquivada
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800/80 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 border-slate-700/80 hover:border-amber-500/30'
                      }`}
                      title={isArquivada ? 'Desarquivar e exibir na tela principal' : 'Arquivar para ocultar da tela do dia a dia'}
                    >
                      {isArquivada ? (
                        <>
                          <ArchiveRestore className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Desarquivar</span>
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5 text-amber-400" />
                          <span>Arquivar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Botão Principal de Detalhes / Acesso */}
                  <button
                    onClick={() => onSelectObra(obra.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                  >
                    <span>Acessar Painel da Obra</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredObras.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800 border-dashed space-y-3">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <p className="text-base font-semibold text-slate-300">
                  {searchTerm 
                    ? `Nenhuma obra encontrada para "${searchTerm}".`
                    : activeTab === 'arquivadas'
                    ? 'Nenhuma obra arquivada no momento.'
                    : activeTab === 'concluidas'
                    ? 'Nenhuma obra concluída no momento.'
                    : 'Nenhuma obra ativa encontrada.'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {searchTerm 
                    ? 'A busca pesquisa em todas as obras (ativas, concluídas e arquivadas).' 
                    : 'Utilize o botão acima para cadastrar sua primeira obra.'}
                </p>
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all cursor-pointer"
                >
                  Limpar Busca
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative z-0">
          <MapContainer 
            center={[-23.5505, -46.6333]} // Padrão São Paulo
            zoom={4} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filteredObras.filter(o => o.latitude && o.longitude).map(obra => (
              <Marker key={obra.id} position={[obra.latitude, obra.longitude]}>
                <Popup className="rounded-xl overflow-hidden !p-0">
                  <div className="p-4 bg-slate-900 text-white min-w-[200px]">
                    <h4 className="font-bold text-sm mb-1">{obra.nome}</h4>
                    <p className="text-xs text-slate-400 mb-2 truncate">{obra.endereco}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        obra.status === 'ativa' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {obra.status === 'ativa' ? 'Ativa' : 'Concluída'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mb-3 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Orçamento Aprovado:</span>
                      <span className="font-bold text-white">
                        {formatMoney((obra.orcamentos && obra.orcamentos.length > 0)
                          ? obra.orcamentos.filter(o => o.status === 'aprovado').reduce((acc, o) => acc + Number(o.valor_total || 0), 0)
                          : Number(obra.valor_aprovado || 0))}
                      </span>
                    </div>
                    <button
                      onClick={() => onSelectObra(obra.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                    >
                      <span>Acessar Obra</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Modal Criar / Editar Obra */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>{editingObra ? 'Editar Obra' : 'Nova Obra'}</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              <form id="obra-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Nome da Obra *</label>
                  <input
                    type="text"
                    name="nome"
                    required
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Ex: Reforma Comercial Centro"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Cliente / Contratante</label>
                  <input
                    type="text"
                    name="cliente"
                    value={formData.cliente}
                    onChange={handleInputChange}
                    placeholder="Ex: Construtora Horizonte ou João Silva"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold text-slate-300">Endereço da Obra</label>
                  <input
                    type="text"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleInputChange}
                    onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true); }}
                    placeholder="Rua, Número, Bairro, Cidade"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  {/* Dropdown de sugestões */}
                  {showSuggestions && (addressSuggestions.length > 0 || isSearchingAddress) && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                      {isSearchingAddress ? (
                        <div className="p-3 text-xs text-slate-400 text-center flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          Buscando...
                        </div>
                      ) : (
                        addressSuggestions.map((feature, idx) => (
                          <div 
                            key={idx}
                            onClick={() => handleSelectAddress(feature)}
                            className="p-3 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/50 last:border-0 flex items-start gap-2.5 transition-colors"
                          >
                            <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                              <span className="text-sm text-white">{feature.properties.address_line1}</span>
                              <span className="text-xs text-slate-400">{feature.properties.address_line2}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Data de Início</label>
                    <input
                      type="date"
                      name="data_inicio"
                      value={formData.data_inicio}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Previsão de Término</label>
                    <input
                      type="date"
                      name="data_prevista_fim"
                      value={formData.data_prevista_fim}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Status da Obra</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="ativa">Ativa (Em execução)</option>
                      <option value="concluida">Concluída (Finalizada)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        name="arquivada"
                        checked={formData.arquivada}
                        onChange={handleInputChange}
                        className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Arquivar esta obra</span>
                    </label>
                  </div>
                </div>


              </form>
            </div>
            
            <div className="p-4 sm:p-5 border-t border-slate-800 flex justify-end gap-2.5 bg-slate-800/30">
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
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Salvando...' : (editingObra ? 'Salvar Alterações' : 'Criar Obra')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {deletingObra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Excluir Obra?</h4>
              <p className="text-xs text-slate-400 mt-1">
                Tem certeza que deseja excluir a obra <strong className="text-slate-200">"{deletingObra.nome}"</strong>?
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setDeletingObra(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteObra}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

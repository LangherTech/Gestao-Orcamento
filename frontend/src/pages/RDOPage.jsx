import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList, Plus, Sun, Cloud, CloudRain, Users, Camera,
  AlertTriangle, ArrowRight, Calendar, Search, Filter, Trash2,
  Edit3, Printer, Eye, X, ShieldCheck, HardHat, Wrench, Package,
  Download, Maximize2, ChevronDown, CheckCircle2, AlertCircle,
  Building2, Sparkles, Clock, FileText, Image as ImageIcon
} from 'lucide-react';
import api from '../services/api';
import { printRDO } from '../components/RDOPrintView';

// ========================================
// Constantes e Helpers
// ========================================
const FUNCOES_SUGERIDAS = [
  'Mestre de Obras',
  'Encarregado',
  'Pedreiro',
  'Gesseiro',
  'Eletricista',
  'Encanador',
  'Pintor',
  'Ajudante',
  'Serralheiro',
  'Vidraceiro'
];

const OPCOES_CLIMA = [
  { valor: 'Ensolarado', label: 'Ensolarado', icon: Sun, color: 'text-amber-400' },
  { valor: 'Nublado', label: 'Nublado', icon: Cloud, color: 'text-slate-400' },
  { valor: 'Chuva Fraca', label: 'Chuva Fraca', icon: CloudRain, color: 'text-blue-400' },
  { valor: 'Chuva Forte', label: 'Chuva Forte', icon: CloudRain, color: 'text-indigo-400' },
];

const formatDataPtBr = (isoDate) => {
  if (!isoDate) return '';
  if (isoDate.includes('/')) return isoDate;
  const parts = isoDate.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoDate;
};

// ========================================
// Modal Genérico
// ========================================
function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizeClasses[size]} glass-panel rounded-2xl shadow-2xl shadow-black/50 border border-slate-700/60 max-h-[92vh] flex flex-col animate-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-400" />
            {title}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

// ========================================
// Lightbox de Foto em Alta Resolução
// ========================================
function PhotoLightboxModal({ photo, onClose }) {
  if (!photo) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-slate-300 hover:text-white bg-slate-800/80 rounded-full hover:bg-slate-700 transition-all cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
        <img
          src={photo.url}
          alt={photo.descricao || 'Foto da obra'}
          className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl border border-slate-700"
        />
        {photo.descricao && (
          <div className="mt-3 px-4 py-2 bg-slate-900/90 rounded-xl border border-slate-800 text-sm text-slate-200 text-center font-medium max-w-xl">
            {photo.descricao}
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// Componente Principal: RDOPage
// ========================================
export default function RDOPage({ selectedObraId, user }) {
  const [rdos, setRdos] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Filtros
  const [selectedObraFilter, setSelectedObraFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRdo, setEditingRdo] = useState(null);
  const [deleteConfirmRdo, setDeleteConfirmRdo] = useState(null);
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState(null);

  // Estado do Formulário
  const [formObraId, setFormObraId] = useState('');
  const [formData, setFormData] = useState(new Date().toISOString().split('T')[0]);
  const [formStatusTrabalho, setFormStatusTrabalho] = useState('praticavel');
  const [formClimaManha, setFormClimaManha] = useState('Ensolarado');
  const [formClimaTarde, setFormClimaTarde] = useState('Ensolarado');
  const [formEquipe, setFormEquipe] = useState([]);
  const [novoMembroInput, setNovoMembroInput] = useState('');
  const [formTotalTrabalhadores, setFormTotalTrabalhadores] = useState(0);
  const [formAtividades, setFormAtividades] = useState('');
  const [formMateriais, setFormMateriais] = useState('');
  const [formEquipamentos, setFormEquipamentos] = useState('');
  const [formDdsTema, setFormDdsTema] = useState('');
  const [formOcorrencias, setFormOcorrencias] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formFotos, setFormFotos] = useState([]); // [{ url, descricao }]
  const [novaFotoUrl, setNovaFotoUrl] = useState('');
  const [novaFotoDescricao, setNovaFotoDescricao] = useState('');
  const [formError, setFormError] = useState('');

  // Carregar Dados
  const fetchData = async () => {
    setLoading(true);
    try {
      const [rdoRes, obrasRes] = await Promise.allSettled([
        api.get(`/rdo${selectedObraId ? `?obra_id=${selectedObraId}` : ''}`),
        api.get('/obras')
      ]);

      if (rdoRes.status === 'fulfilled' && Array.isArray(rdoRes.value.data)) {
        setRdos(rdoRes.value.data);
      }
      if (obrasRes.status === 'fulfilled' && Array.isArray(obrasRes.value.data)) {
        setObras(obrasRes.value.data);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do RDO:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedObraId]);

  // Abrir Modal de Criação
  const handleOpenNew = () => {
    setEditingRdo(null);
    setFormObraId(selectedObraId || (obras.length > 0 ? obras[0].id : ''));
    setFormData(new Date().toISOString().split('T')[0]);
    setFormStatusTrabalho('praticavel');
    setFormClimaManha('Ensolarado');
    setFormClimaTarde('Ensolarado');
    setFormEquipe([]);
    setFormTotalTrabalhadores(0);
    setFormAtividades('');
    setFormMateriais('');
    setFormEquipamentos('');
    setFormDdsTema('Uso de EPIs obrigatórios (óculos, luvas, capacete e bota com biqueira).');
    setFormOcorrencias('');
    setFormObservacoes('');
    setFormFotos([]);
    setNovaFotoUrl('');
    setNovaFotoDescricao('');
    setFormError('');
    setIsFormOpen(true);
  };

  // Abrir Modal de Edição
  const handleOpenEdit = (rdo) => {
    setEditingRdo(rdo);
    setFormObraId(rdo.obra_id || '');
    setFormData(rdo.data || new Date().toISOString().split('T')[0]);
    setFormStatusTrabalho(rdo.status_trabalho || 'praticavel');
    setFormClimaManha(rdo.clima_manha || 'Ensolarado');
    setFormClimaTarde(rdo.clima_tarde || 'Ensolarado');
    setFormEquipe(rdo.equipe_presente || []);
    setFormTotalTrabalhadores(rdo.total_trabalhadores || (rdo.equipe_presente ? rdo.equipe_presente.length : 0));
    setFormAtividades(rdo.atividades_realizadas || '');
    setFormMateriais(rdo.materiais_utilizados || '');
    setFormEquipamentos(rdo.equipamentos || '');
    setFormDdsTema(rdo.dds_tema || '');
    setFormOcorrencias(rdo.ocorrencias || '');
    setFormObservacoes(rdo.observacoes || '');
    setFormFotos((rdo.fotos || []).map(f => ({ url: f.url, descricao: f.descricao || '' })));
    setNovaFotoUrl('');
    setNovaFotoDescricao('');
    setFormError('');
    setIsFormOpen(true);
  };

  // Carregar equipe escalada ao mudar obra ou data (apenas para novos RDOs)
  useEffect(() => {
    if (isFormOpen && !editingRdo && formObraId && formData) {
      const fetchAlocacoes = async () => {
        try {
          const res = await api.get(`/calendario/alocacoes?obra_id=${formObraId}`);
          if (res.data && Array.isArray(res.data)) {
            const activeAlocacoes = res.data.filter(a => {
              return a.data_inicio <= formData && a.data_fim >= formData;
            });
            const equipeStrings = activeAlocacoes.map(a => {
               const cargo = a.funcionario_cargo ? ` (${a.funcionario_cargo})` : '';
               return `${a.funcionario_nome}${cargo}`;
            });
            const uniqueEquipe = [...new Set(equipeStrings)];
            setFormEquipe(uniqueEquipe);
            setFormTotalTrabalhadores(uniqueEquipe.length);
          }
        } catch (err) {
          console.error('Erro ao carregar equipe escalada', err);
        }
      };
      fetchAlocacoes();
    }
  }, [formObraId, formData, isFormOpen, editingRdo]);

  // Adicionar membro na equipe
  const handleAddMembro = (nome) => {
    const val = (nome || novoMembroInput).trim();
    if (!val) return;
    if (!formEquipe.includes(val)) {
      const updated = [...formEquipe, val];
      setFormEquipe(updated);
      setFormTotalTrabalhadores(updated.length);
    }
    setNovoMembroInput('');
  };

  // Remover membro da equipe
  const handleRemoveMembro = (idx) => {
    const updated = formEquipe.filter((_, i) => i !== idx);
    setFormEquipe(updated);
    setFormTotalTrabalhadores(updated.length);
  };

  // Upload ou adição de foto por arquivo local (Base64)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Converte para Base64 Data URL para salvar diretamente no banco
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Data = uploadEvent.target?.result;
      if (base64Data) {
        setFormFotos(prev => [
          ...prev,
          { url: base64Data, descricao: novaFotoDescricao.trim() || file.name }
        ]);
        setNovaFotoDescricao('');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Adicionar foto por URL
  const handleAddFotoUrl = () => {
    if (!novaFotoUrl.trim()) return;
    setFormFotos(prev => [
      ...prev,
      { url: novaFotoUrl.trim(), descricao: novaFotoDescricao.trim() || 'Foto de campo' }
    ]);
    setNovaFotoUrl('');
    setNovaFotoDescricao('');
  };

  const handleRemoveFoto = (idx) => {
    setFormFotos(prev => prev.filter((_, i) => i !== idx));
  };

  // Salvar Apontamento
  const handleSaveRdo = async () => {
    if (!formAtividades.trim()) {
      setFormError('Por favor, descreva as atividades executadas no dia.');
      return;
    }

    setSaving(true);
    setFormError('');

    const payload = {
      obra_id: formObraId || null,
      data: formData,
      status_trabalho: formStatusTrabalho,
      clima_manha: formClimaManha,
      clima_tarde: formClimaTarde,
      condicoes_climaticas: `${formClimaManha} / ${formClimaTarde}`,
      equipe_presente: formEquipe,
      total_trabalhadores: Number(formTotalTrabalhadores) || formEquipe.length,
      atividades_realizadas: formAtividades.trim(),
      materiais_utilizados: formMateriais.trim() || null,
      equipamentos: formEquipamentos.trim() || null,
      dds_tema: formDdsTema.trim() || null,
      ocorrencias: formOcorrencias.trim() || null,
      observacoes: formObservacoes.trim() || null,
      fotos: formFotos.map(f => ({ url: f.url, descricao: f.descricao }))
    };

    try {
      if (editingRdo?.id) {
        await api.put(`/rdo/${editingRdo.id}`, payload);
        setToastMsg('Diário de Obra atualizado com sucesso!');
      } else {
        await api.post('/rdo', payload);
        setToastMsg('Diário de Obra registrado com sucesso!');
      }
      setIsFormOpen(false);
      await fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao salvar Diário de Obra. Tente novamente.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Excluir Apontamento
  const handleDeleteRdo = async () => {
    if (!deleteConfirmRdo) return;
    try {
      await api.delete(`/rdo/${deleteConfirmRdo.id}`);
      setRdos(prev => prev.filter(r => r.id !== deleteConfirmRdo.id));
      setToastMsg('Diário de Obra excluído com sucesso.');
      setDeleteConfirmRdo(null);
    } catch (err) {
      alert('Erro ao excluir Diário de Obra.');
    }
  };

  // Filtros aplicados em memória
  const filteredRdos = useMemo(() => {
    return rdos.filter(r => {
      if (selectedObraFilter && r.obra_id !== selectedObraFilter) return false;
      if (statusFilter && r.status_trabalho !== statusFilter) return false;
      if (dataInicio && r.data < dataInicio) return false;
      if (dataFim && r.data > dataFim) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inAtividades = (r.atividades_realizadas || '').toLowerCase().includes(q);
        const inMateriais = (r.materiais_utilizados || '').toLowerCase().includes(q);
        const inEquipe = (r.equipe_presente || []).some(e => e.toLowerCase().includes(q));
        const inObra = (r.obra_nome || '').toLowerCase().includes(q);
        if (!inAtividades && !inMateriais && !inEquipe && !inObra) return false;
      }
      return true;
    });
  }, [rdos, selectedObraFilter, statusFilter, dataInicio, dataFim, searchQuery]);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    const total = filteredRdos.length;
    const diasChuva = filteredRdos.filter(r => r.status_trabalho === 'impraticavel_chuva').length;
    const totalEfetivo = filteredRdos.reduce((sum, r) => sum + (r.total_trabalhadores || (r.equipe_presente ? r.equipe_presente.length : 0)), 0);
    const mediaEfetivo = total > 0 ? (totalEfetivo / total).toFixed(1) : 0;
    const totalFotos = filteredRdos.reduce((sum, r) => sum + (r.fotos ? r.fotos.length : 0), 0);
    return { total, diasChuva, mediaEfetivo, totalFotos };
  }, [filteredRdos]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-xl animate-in">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Canteiro de Obras
            </span>
            <span className="text-xs text-slate-400 font-medium">Controle Diário Oficial</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Diário de Obra (RDO)</h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Registro diário das atividades de campo, efetivo de trabalhadores, insumos consumidos, clima e acervo fotográfico com emissão em PDF A4.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Preencher RDO de Hoje</span>
          </button>
        </div>
      </div>

      {/* KPIs do Canteiro */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Apontamentos Registrados', value: stats.total, icon: ClipboardList, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'Dias com Paralisação / Chuva', value: stats.diasChuva, icon: CloudRain, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Média de Efetivo / Dia', value: `${stats.mediaEfetivo} operários`, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Fotos Catalogadas', value: stats.totalFotos, icon: Camera, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
        ].map((kpi, idx) => (
          <div key={idx} className={`glass-card rounded-2xl p-4 border ${kpi.border} transition-all`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">{kpi.label}</span>
              <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
            </div>
            <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por atividade realizada, material, membro da equipe ou obra..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Obra */}
          <div className="relative">
            <select
              value={selectedObraFilter}
              onChange={(e) => setSelectedObraFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            >
              <option value="">Todas as Obras</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </div>

          {/* Seletor de Condição */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            >
              <option value="">Todas as Condições</option>
              <option value="praticavel">Praticável (Normal)</option>
              <option value="impraticavel_chuva">Impraticável (Chuva)</option>
              <option value="parcial">Trabalho Parcial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Apontamentos Diários */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400">Carregando Diários de Obra...</p>
        </div>
      ) : filteredRdos.length > 0 ? (
        <div className="space-y-5">
          {filteredRdos.map((rdo) => {
            const isImpraticavel = rdo.status_trabalho === 'impraticavel_chuva';
            const isParcial = rdo.status_trabalho === 'parcial';
            const fotosCount = (rdo.fotos || []).length;

            return (
              <div
                key={rdo.id}
                className="glass-card rounded-2xl p-6 border border-slate-800/80 hover:border-slate-700 transition-all shadow-xl"
              >
                {/* Cabeçalho do Card */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/70 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                        {rdo.obra_nome || 'Obra Avulsa'}
                      </span>
                      {rdo.obra_cliente && (
                        <span className="text-xs text-slate-400 font-medium">
                          • Cliente: <strong className="text-slate-200">{rdo.obra_cliente}</strong>
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span>Apontamento Diário • {formatDataPtBr(rdo.data)}</span>
                    </h3>
                  </div>

                  {/* Badges de Clima, Efetivo e Status */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Badge de Praticabilidade */}
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                      isImpraticavel
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : isParcial
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}>
                      {isImpraticavel ? <CloudRain className="w-3.5 h-3.5 text-red-400" /> : <Sun className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{isImpraticavel ? 'Impraticável' : isParcial ? 'Parcial' : 'Praticável'}</span>
                    </span>

                    {/* Clima */}
                    <span className="px-3 py-1 rounded-xl text-xs font-medium bg-slate-800/80 border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>M: {rdo.clima_manha} • T: {rdo.clima_tarde}</span>
                    </span>

                    {/* Efetivo */}
                    <span className="px-3 py-1 rounded-xl text-xs font-medium bg-slate-800/80 border border-slate-700/80 text-blue-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>{rdo.total_trabalhadores || (rdo.equipe_presente ? rdo.equipe_presente.length : 0)} trabalhadores</span>
                    </span>

                    {/* Fotos */}
                    {fotosCount > 0 && (
                      <span className="px-3 py-1 rounded-xl text-xs font-medium bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-purple-400" />
                        <span>{fotosCount} fotos</span>
                      </span>
                    )}

                    {/* Ações Rápidas */}
                    <div className="flex items-center gap-1.5 ml-2 border-l border-slate-800 pl-3">
                      <button
                        onClick={() => printRDO(rdo)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-all cursor-pointer"
                        title="Imprimir / Gerar PDF Oficial"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-400" />
                        <span>PDF</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(rdo)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                        title="Editar Diário"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteConfirmRdo(rdo)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="Excluir Diário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {rdo.created_by && (
                    <div className="w-full text-right text-[9px] text-slate-500 mt-2">
                      Preenchido por {rdo.created_by === user?.id ? 'Você' : 'Sócio'}
                    </div>
                  )}
                </div>

                {/* Conteúdo Técnico do RDO */}
                <div className="space-y-4 text-xs">
                  {/* Equipe no Canteiro */}
                  {rdo.equipe_presente && rdo.equipe_presente.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Equipe Presente no Canteiro:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {rdo.equipe_presente.map((p, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-medium">
                            ✓ {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Atividades Executadas */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Atividades Desenvolvidas no Dia:
                    </span>
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line font-normal">
                      {rdo.atividades_realizadas}
                    </p>
                  </div>

                  {/* Materiais e Equipamentos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <Package className="w-3.5 h-3.5 text-amber-400" />
                        Materiais & Entregas Recebidas
                      </span>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                        {rdo.materiais_utilizados || 'Sem registro de consumo ou recebimento especial no dia.'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <Wrench className="w-3.5 h-3.5 text-blue-400" />
                        Maquinário & Equipamentos
                      </span>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                        {rdo.equipamentos || 'Ferramentas manuais e maquinário de praxe em operação.'}
                      </p>
                    </div>
                  </div>

                  {/* Segurança DDS & Ocorrências */}
                  {(rdo.dds_tema || rdo.ocorrencias) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {rdo.dds_tema && (
                        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Diálogo Diário de Segurança (DDS) & EPIs
                          </span>
                          <p className="text-emerald-200/90">{rdo.dds_tema}</p>
                        </div>
                      )}
                      {rdo.ocorrencias && (
                        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            Ocorrências & Observações
                          </span>
                          <p className="text-amber-200/90">{rdo.ocorrencias}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Galeria de Fotos Anexadas */}
                  {fotosCount > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-purple-400" />
                        Registro Fotográfico do Dia ({fotosCount})
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {rdo.fotos.map((f, fIdx) => (
                          <div
                            key={fIdx}
                            onClick={() => setActiveLightboxPhoto(f)}
                            className="group relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 cursor-pointer hover:border-emerald-500/50 transition-all shadow-md aspect-video"
                          >
                            <img
                              src={f.url}
                              alt={f.descricao || 'Foto do canteiro'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x300?text=Foto'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                              <span className="text-[10px] text-white font-medium truncate">
                                {f.descricao || 'Ver foto ampliada'}
                              </span>
                            </div>
                            <div className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              <Maximize2 className="w-3 h-3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-2xl border border-slate-800">
          <ClipboardList className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-semibold text-slate-300 mb-1">
            {searchQuery || selectedObraFilter || statusFilter
              ? 'Nenhum apontamento encontrado com os filtros selecionados'
              : 'Nenhum Diário de Obra registrado ainda'}
          </h3>
          <p className="text-sm text-slate-500 mb-4 max-w-md">
            {searchQuery || selectedObraFilter || statusFilter
              ? 'Tente limpar a busca ou selecionar outra obra.'
              : 'Comece a registrar os acontecimentos diários da obra, presença de funcionários e fotos de progresso.'}
          </p>
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Primeiro Apontamento</span>
          </button>
        </div>
      )}

      {/* Modal de Criação / Edição de RDO */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingRdo ? `Editar Diário de Obra • ${formatDataPtBr(formData)}` : 'Novo Apontamento Diário de Obra'}
        size="xl"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Seção 1: Identificação, Obra e Data */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              1. Identificação da Obra e Data
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Obra Vinculada</label>
                <select
                  value={formObraId}
                  onChange={(e) => setFormObraId(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  <option value="">Obra Avulsa / Geral</option>
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.nome} ({o.cliente || 'Sem cliente'})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-400">Data do Apontamento *</label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setFormData(new Date().toISOString().split('T')[0])}
                      className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      Hoje
                    </button>
                    <span className="text-[10px] text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        setFormData(d.toISOString().split('T')[0]);
                      }}
                      className="text-[10px] text-slate-400 hover:underline cursor-pointer"
                    >
                      Ontem
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={formData}
                  onChange={(e) => setFormData(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Condição de Trabalho</label>
                <select
                  value={formStatusTrabalho}
                  onChange={(e) => setFormStatusTrabalho(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  <option value="praticavel">Praticável (Trabalho Normal)</option>
                  <option value="impraticavel_chuva">Impraticável (Chuva / Intempérie)</option>
                  <option value="parcial">Trabalho Parcial (Meio Expediente)</option>
                </select>
              </div>
            </div>

            {/* Clima Manhã e Tarde */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Clima no Período da Manhã</label>
                <select
                  value={formClimaManha}
                  onChange={(e) => setFormClimaManha(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  {OPCOES_CLIMA.map(opt => (
                    <option key={opt.valor} value={opt.valor}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Clima no Período da Tarde</label>
                <select
                  value={formClimaTarde}
                  onChange={(e) => setFormClimaTarde(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  {OPCOES_CLIMA.map(opt => (
                    <option key={opt.valor} value={opt.valor}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Seção 2: Efetivo no Canteiro */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                2. Efetivo / Mão de Obra Presente ({formEquipe.length} profissionais)
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Total Operários:</span>
                <input
                  type="number"
                  min="0"
                  value={formTotalTrabalhadores}
                  onChange={(e) => setFormTotalTrabalhadores(parseInt(e.target.value) || 0)}
                  className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-center text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Input para adicionar profissional */}
            <div className="flex gap-2">
              <input
                type="text"
                value={novoMembroInput}
                onChange={(e) => setNovoMembroInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMembro(); } }}
                placeholder="Nome do profissional e função (ex: João Silva - Gesseiro)..."
                className="flex-1 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                type="button"
                onClick={() => handleAddMembro()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer"
              >
                Adicionar
              </button>
            </div>

            {/* Sugestões de funções rápidas */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold mr-1">Sugestões rápidas:</span>
              {FUNCOES_SUGERIDAS.map(func => (
                <button
                  key={func}
                  type="button"
                  onClick={() => handleAddMembro(func)}
                  className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  + {func}
                </button>
              ))}
            </div>

            {/* Chips de membros adicionados */}
            {formEquipe.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {formEquipe.map((membro, idx) => (
                  <span key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white">
                    <span>{membro}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMembro(idx)}
                      className="text-slate-400 hover:text-red-400 cursor-pointer ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Seção 3: Atividades Desenvolvidas no Dia */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              3. Atividades Desenvolvidas no Dia *
            </h4>
            <textarea
              rows={4}
              value={formAtividades}
              onChange={(e) => setFormAtividades(e.target.value)}
              placeholder="Descreva detalhadamente os serviços executados em cada frente de trabalho (ex: Execução de alvenaria na fachada, passagem de conduítes na sala de estar, impermeabilização do banheiro da suíte 1)..."
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 leading-relaxed resize-y"
            />
          </div>

          {/* Seção 4: Materiais e Equipamentos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                4. Materiais Consumidos & Entregas
              </h4>
              <textarea
                rows={3}
                value={formMateriais}
                onChange={(e) => setFormMateriais(e.target.value)}
                placeholder="Ex: 20 sacos de cimento CP-II, 40 placas drywall ST, entrega de tinta Suvinil..."
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 leading-relaxed resize-y"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-400" />
                5. Equipamentos & Maquinário
              </h4>
              <textarea
                rows={3}
                value={formEquipamentos}
                onChange={(e) => setFormEquipamentos(e.target.value)}
                placeholder="Ex: Betoneira 400L em operação, 2 lances de andaime, pistola de fixação a pólvora..."
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* Seção 5: Segurança (DDS) e Ocorrências */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                6. Segurança do Trabalho & DDS
              </h4>
              <textarea
                rows={3}
                value={formDdsTema}
                onChange={(e) => setFormDdsTema(e.target.value)}
                placeholder="Tema do Diálogo Diário de Segurança e conferência de EPIs..."
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 leading-relaxed resize-y"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                7. Ocorrências & Imprevistos
              </h4>
              <textarea
                rows={3}
                value={formOcorrencias}
                onChange={(e) => setFormOcorrencias(e.target.value)}
                placeholder="Atrasos de fornecedores, interferências do cliente, acidentes ou paralisações..."
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* Seção 6: Fotos do Canteiro */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-400" />
              8. Registro Fotográfico de Campo ({formFotos.length} fotos anexadas)
            </h4>

            {/* Inputs de Anexar Foto */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={novaFotoUrl}
                  onChange={(e) => setNovaFotoUrl(e.target.value)}
                  placeholder="Cole URL da foto (ou use o botão de arquivo ao lado)..."
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={novaFotoDescricao}
                  onChange={(e) => setNovaFotoDescricao(e.target.value)}
                  placeholder="Legenda da foto (ex: Armação pronta)..."
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div className="sm:col-span-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAddFotoUrl}
                  disabled={!novaFotoUrl.trim()}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 disabled:opacity-50 cursor-pointer"
                >
                  Adicionar URL
                </button>
                <label className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 cursor-pointer">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Arquivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Grid de fotos anexadas */}
            {formFotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {formFotos.map((foto, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 group aspect-video">
                    <img
                      src={foto.url}
                      alt={foto.descricao || `Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveFoto(idx)}
                        className="self-end p-1 rounded-lg bg-red-500/80 text-white hover:bg-red-600 cursor-pointer"
                        title="Remover foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] text-white font-medium truncate">
                        {foto.descricao || 'Sem legenda'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botões do Modal */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveRdo}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Salvando Apontamento...' : (editingRdo ? 'Atualizar Diário' : 'Salvar Diário de Obra')}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={!!deleteConfirmRdo}
        onClose={() => setDeleteConfirmRdo(null)}
        title="Confirmar Exclusão de Diário de Obra"
        size="sm"
      >
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-sm text-slate-300">
              Tem certeza que deseja excluir o Diário de Obra do dia
            </p>
            <p className="text-sm font-bold text-white mt-1">
              "{formatDataPtBr(deleteConfirmRdo?.data)}" ({deleteConfirmRdo?.obra_nome || 'Obra Avulsa'})?
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Todas as informações e fotos vinculadas a este dia serão permanentemente removidas.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setDeleteConfirmRdo(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteRdo}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 transition-all cursor-pointer"
            >
              Sim, Excluir
            </button>
          </div>
        </div>
      </Modal>

      {/* Lightbox Modal de Foto Ampliada */}
      <PhotoLightboxModal
        photo={activeLightboxPhoto}
        onClose={() => setActiveLightboxPhoto(null)}
      />
    </div>
  );
}

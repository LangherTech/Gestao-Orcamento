import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet, Plus, Sparkles, FileText, Layers, Tag, X,
  Search, Filter, ChevronDown, ChevronUp, Trash2, Edit3,
  Package, DollarSign, Percent, Wrench, Eye, Save, ArrowLeft,
  Calculator, AlertCircle, CheckCircle, Copy, Download,
  Building2, Check, Clock, Send, XCircle, Phone, Mail
} from 'lucide-react';
import api from '../services/api';
import { PropostaComercialPreviewModal, printPropostaComercial } from '../components/PropostaComercialView';


// ========================================
// Constantes e Helpers
// ========================================
const CATEGORIAS_PADRAO = [
  'Alvenaria e Fechamentos',
  'Elétrica',
  'Gesso e Drywall',
  'Hidráulica',
  'Pintura e Acabamento',
  'Pisos e Revestimentos',
  'Estrutura',
  'Impermeabilização',
  'Esquadrias',
  'Cobertura',
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatPercent = (value) => `${(value || 0).toFixed(1)}%`;

// Helper de Formatação e Filtro de Telefone (DDD + 8 ou 9 dígitos, máx 11 dígitos)
const formatTelefone = (value) => {
  if (!value) return '';
  // Limita estritamente a números e no máximo 11 dígitos
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

// Helper de Sanitização e Filtro de E-mail
const sanitizeEmail = (value) => {
  if (!value) return '';
  // Remove espaços indesejados, converte para minúsculas e restringe tamanho a 80 caracteres
  return value.replace(/\s+/g, '').toLowerCase().slice(0, 80);
};

// Validador de formato de e-mail
const isValidEmail = (email) => {
  if (!email) return true;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
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
    xl: 'max-w-6xl',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizeClasses[size]} glass-panel rounded-2xl shadow-2xl shadow-black/40 border border-slate-700/50 max-h-[90vh] flex flex-col animate-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">{title}</h3>
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
// Toast Notification
// ========================================
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    error: 'bg-red-500/20 border-red-500/40 text-red-300',
    info: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  };
  const icons = {
    success: <CheckCircle className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
    info: <Sparkles className="w-4 h-4" />,
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl border ${styles[type]} shadow-lg animate-in`}>
      {icons[type]}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

// ========================================
// Card de Serviço
// ========================================
function ServicoCard({ servico, onEdit, onDelete, onDuplicate, onViewDetails }) {
  const [expanded, setExpanded] = useState(false);
  const materiais = servico.servico_materiais || [];
  const custoMateriais = materiais.reduce((sum, m) => sum + (m.subtotal || m.quantidade * m.preco_unitario || 0), 0);

  return (
    <div className="glass-card rounded-2xl overflow-hidden group">
      {/* Header do Card */}
      <div className="p-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {servico.categoria || 'Geral'}
              </span>
              {servico.obra_id && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Vinculado à Obra
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white mb-1">{servico.nome}</h3>
            {servico.descricao && (
              <p className="text-xs text-slate-400 line-clamp-2">{servico.descricao}</p>
            )}
          </div>

          {/* Métricas */}
          <div className="flex items-center gap-6 md:text-right shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Preço Final</span>
              <span className="text-lg font-bold text-emerald-400">{formatCurrency(servico.preco_total)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Mão de Obra</span>
              <span className="text-sm font-semibold text-slate-200">{formatCurrency(servico.mao_de_obra)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Margem</span>
              <span className="text-sm font-semibold text-purple-300">{formatPercent(servico.margem_lucro)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Materiais</span>
              <span className="text-sm font-semibold text-amber-300">{formatCurrency(custoMateriais)}</span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/60">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <Package className="w-3.5 h-3.5" />
            <span>{materiais.length} insumo{materiais.length !== 1 ? 's' : ''} na composição</span>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => onDuplicate(servico)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer" title="Duplicar">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onEdit(servico)} className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer" title="Editar">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(servico)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer" title="Excluir">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Composição de Materiais (Expandível) */}
      {expanded && materiais.length > 0 && (
        <div className="border-t border-slate-800/60 bg-slate-900/30 px-5 py-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Composição de Insumos
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-semibold">Material</th>
                  <th className="text-center py-2 px-3 font-semibold">Unidade</th>
                  <th className="text-center py-2 px-3 font-semibold">Qtde</th>
                  <th className="text-center py-2 px-3 font-semibold">Rend.</th>
                  <th className="text-right py-2 px-3 font-semibold">Preço Unit.</th>
                  <th className="text-right py-2 pl-3 font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {materiais.map((m, idx) => (
                  <tr key={m.id || idx} className="border-t border-slate-800/40 text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">
                      {m.materiais?.nome || m.material_nome || 'Material'}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400">
                      {m.materiais?.unidade || m.material_unidade || '-'}
                    </td>
                    <td className="py-2 px-3 text-center">{m.quantidade}</td>
                    <td className="py-2 px-3 text-center">{m.rendimento}x</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(m.preco_unitario)}</td>
                    <td className="py-2 pl-3 text-right font-semibold text-emerald-400">
                      {formatCurrency(m.subtotal || m.quantidade * m.preco_unitario)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-700">
                  <td colSpan={5} className="py-2 pr-3 text-right font-bold text-slate-300 uppercase text-[11px]">Total Insumos:</td>
                  <td className="py-2 pl-3 text-right font-bold text-emerald-400">{formatCurrency(custoMateriais)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {expanded && materiais.length === 0 && (
        <div className="border-t border-slate-800/60 bg-slate-900/30 px-5 py-6 text-center">
          <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Nenhum insumo vinculado a este serviço.</p>
        </div>
      )}
    </div>
  );
}

// ========================================
// Formulário de Serviço (Criar/Editar)
// ========================================
function ServicoForm({ servico, materiais, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    unidade: 'Unidade',
    preco_total: 0,
    margem_lucro: 0,
    mao_de_obra: 0,
    ...servico,
  });
  const [composicao, setComposicao] = useState(
    servico?.servico_materiais?.map(sm => ({
      material_id: sm.material_id,
      quantidade: sm.quantidade,
      rendimento: sm.rendimento,
      preco_unitario: sm.preco_unitario,
      material_nome: sm.materiais?.nome || sm.material_nome || '',
    })) || []
  );
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ nome: '', unidade: 'ML', preco_medio: '' });
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [localMateriais, setLocalMateriais] = useState(materiais);

  const custoMateriais = composicao.reduce((sum, m) => sum + (m.quantidade * m.preco_unitario), 0);
  const custoTotal = custoMateriais + (form.mao_de_obra || 0);
  const precoComMargem = custoTotal * (1 + (form.margem_lucro || 0) / 100);

  // Calcular preço total automaticamente
  useEffect(() => {
    setForm(prev => ({ ...prev, preco_total: Math.round(precoComMargem * 100) / 100 }));
  }, [precoComMargem]);

  const handleAddMaterial = (material) => {
    setComposicao(prev => [...prev, {
      material_id: material.id,
      quantidade: 1,
      rendimento: 1,
      preco_unitario: material.preco_medio || 0,
      material_nome: material.nome,
    }]);
    setShowAddMaterial(false);
    setMaterialSearch('');
  };

  const handleRemoveMaterial = (idx) => {
    setComposicao(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateComposicao = (idx, field, value) => {
    setComposicao(prev => prev.map((m, i) => i === idx ? { ...m, [field]: parseFloat(value) || 0 } : m));
  };

  const handleSubmit = () => {
    const payload = {
      ...form,
      materiais: composicao.map(c => ({
        material_id: c.material_id,
        quantidade: c.quantidade,
        rendimento: c.rendimento,
        preco_unitario: c.preco_unitario,
      })),
    };
    onSave(payload);
  };

  const filteredMateriais = localMateriais.filter(m =>
    m.nome.toLowerCase().includes(materialSearch.toLowerCase()) &&
    !composicao.find(c => c.material_id === m.id)
  );

  const handleCreateMaterial = async () => {
    if (!newMaterial.nome.trim()) return;
    setSavingMaterial(true);
    try {
      const res = await api.post('/servicos/materiais', {
        nome: newMaterial.nome.trim(),
        unidade: newMaterial.unidade.trim() || 'ML',
        preco_medio: parseFloat(String(newMaterial.preco_medio).replace(',', '.')) || 0,
      });
      const created = res.data;
      setLocalMateriais(prev => [...prev, created]);
      handleAddMaterial(created);
      setNewMaterial({ nome: '', unidade: 'ML', preco_medio: '' });
      setShowNewMaterial(false);
    } catch (err) {
      console.error('Erro ao criar material', err);
    } finally {
      setSavingMaterial(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dados Básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nome do Serviço *</label>
          <input
            type="text"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Parede Drywall Standard 120mm"
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Descrição</label>
          <textarea
            value={form.descricao || ''}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            rows={2}
            placeholder="Descrição detalhada do serviço..."
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Categoria</label>
          <select
            value={form.categoria || ''}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer"
          >
            <option value="">Selecione uma categoria</option>
            {CATEGORIAS_PADRAO.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Unidade</label>
          <select
            value={form.unidade || 'Unidade'}
            onChange={(e) => setForm({ ...form, unidade: e.target.value })}
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer"
          >
            {['ML', 'M²', 'M³', 'Unidade'].map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5"><Wrench className="w-3 h-3" /> Mão de Obra (R$)</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.mao_de_obra}
            onChange={(e) => setForm({ ...form, mao_de_obra: parseFloat(e.target.value) || 0 })}
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5"><Percent className="w-3 h-3" /> Margem de Lucro (%)</span>
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={form.margem_lucro}
            onChange={(e) => setForm({ ...form, margem_lucro: parseFloat(e.target.value) || 0 })}
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> Preço Final Calculado</span>
          </label>
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-sm text-emerald-400 font-bold">
            {formatCurrency(form.preco_total)}
          </div>
        </div>
      </div>

      {/* Resumo de Custos */}
      <div className="glass-card rounded-xl p-4 border border-slate-700/40">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-white">Resumo de Composição de Custo</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
            <span className="text-slate-500 block mb-0.5">Materiais</span>
            <span className="text-amber-300 font-bold text-sm">{formatCurrency(custoMateriais)}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
            <span className="text-slate-500 block mb-0.5">Mão de Obra</span>
            <span className="text-blue-300 font-bold text-sm">{formatCurrency(form.mao_de_obra)}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
            <span className="text-slate-500 block mb-0.5">Custo Total</span>
            <span className="text-slate-200 font-bold text-sm">{formatCurrency(custoTotal)}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-emerald-500/80 block mb-0.5">+ Margem {formatPercent(form.margem_lucro)}</span>
            <span className="text-emerald-400 font-bold text-sm">{formatCurrency(form.preco_total)}</span>
          </div>
        </div>
      </div>

      {/* Composição de Materiais */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">Composição de Insumos ({composicao.length})</span>
          </div>
          <button
            onClick={() => setShowAddMaterial(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Adicionar Insumo
          </button>
        </div>

        {composicao.length > 0 ? (
          <div className="space-y-2">
            {composicao.map((m, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-white truncate block">{m.material_nome}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Qtde</label>
                    <input
                      type="number" step="0.01" min="0.01"
                      value={m.quantidade}
                      onChange={(e) => handleUpdateComposicao(idx, 'quantidade', e.target.value)}
                      className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Rend.</label>
                    <input
                      type="number" step="0.1" min="0.1"
                      value={m.rendimento}
                      onChange={(e) => handleUpdateComposicao(idx, 'rendimento', e.target.value)}
                      className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">R$ Unit.</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={m.preco_unitario}
                      onChange={(e) => handleUpdateComposicao(idx, 'preco_unitario', e.target.value)}
                      className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="text-right min-w-[80px]">
                    <label className="text-[10px] text-slate-500 block">Subtotal</label>
                    <span className="text-xs font-semibold text-emerald-400">
                      {formatCurrency(m.quantidade * m.preco_unitario)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveMaterial(idx)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-900/20 border border-dashed border-slate-700 text-center">
            <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Clique em "Adicionar Insumo" para compor este serviço</p>
          </div>
        )}

        {/* Lista de materiais para adicionar */}
        {showAddMaterial && (
          <div className="mt-3 p-4 rounded-xl bg-slate-900/60 border border-slate-700/60">
            {!showNewMaterial ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    placeholder="Buscar insumo..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                    autoFocus
                  />
                  <button onClick={() => { setShowAddMaterial(false); setMaterialSearch(''); }} className="text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredMateriais.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleAddMaterial(m)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                    >
                      <div>
                        <span className="text-sm text-white font-medium">{m.nome}</span>
                        <span className="text-[10px] text-slate-400 ml-2">({m.unidade})</span>
                      </div>
                      <span className="text-xs text-emerald-400 font-semibold">{formatCurrency(m.preco_medio)}</span>
                    </button>
                  ))}
                  {filteredMateriais.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-3">Nenhum insumo encontrado</p>
                  )}
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800">
                  <button
                    onClick={() => setShowNewMaterial(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Cadastrar novo insumo
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    Novo Insumo
                  </span>
                  <button onClick={() => setShowNewMaterial(false)} className="text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Nome do Insumo *</label>
                  <input
                    type="text"
                    value={newMaterial.nome}
                    onChange={(e) => setNewMaterial(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Ex: Placa Drywall ST 12.5mm"
                    autoFocus
                    className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Unidade</label>
                    <select
                      value={newMaterial.unidade}
                      onChange={(e) => setNewMaterial(p => ({ ...p, unidade: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {['ML', 'M²', 'M³', 'Unidade'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Preço Médio (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newMaterial.preco_medio}
                      onChange={(e) => setNewMaterial(p => ({ ...p, preco_medio: e.target.value }))}
                      placeholder="0.00"
                      className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowNewMaterial(false)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleCreateMaterial}
                    disabled={!newMaterial.nome.trim() || savingMaterial}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    {savingMaterial ? 'Salvando...' : 'Salvar e Adicionar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botões */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!form.nome || isLoading}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {servico ? 'Salvar Alterações' : 'Criar Serviço'}
        </button>
      </div>
    </div>
  );
}

// ========================================
// ========================================
// Modal de Geração e Edição de Orçamento
// ========================================
function OrcamentoModal({
  isOpen,
  onClose,
  servicos = [],
  materiais = [],
  obras = [],
  onSaveSuccess,
  onMaterialCreated,
  initialOrcamento = null,
  readOnlyView = false
}) {
  const [itens, setItens] = useState([]);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteEndereco, setClienteEndereco] = useState('BLUMENAU / SC');
  const [prazoDias, setPrazoDias] = useState(10);
  const [prazoGarantia, setPrazoGarantia] = useState('12 (doze) meses');
  const [objetivoCustom, setObjetivoCustom] = useState('');
  const [condicoesPagamentoCustom, setCondicoesPagamentoCustom] = useState('');
  const [obraId, setObraId] = useState('');
  const [status, setStatus] = useState('rascunho');
  const [observacoes, setObservacoes] = useState('');
  const [notas, setNotas] = useState('');
  const [validadeDias, setValidadeDias] = useState(15);
  const [step, setStep] = useState(1); // 1: edição/seleção, 2: preview/PDF
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentId, setCurrentId] = useState(null);

  // Busca e Filtros
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [itemFilterType, setItemFilterType] = useState('todos'); // 'todos', 'servicos', 'insumos'

  // Novo Insumo
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ nome: '', unidade: 'ML', preco_medio: '' });
  const [savingMaterial, setSavingMaterial] = useState(false);

  useEffect(() => {
    if (initialOrcamento) {
      setCurrentId(initialOrcamento.id);
      setClienteNome(initialOrcamento.cliente_nome || '');

      // Extrai telefone e email (mesmo se vier do contato concatenado antigo)
      let tel = initialOrcamento.cliente_telefone || '';
      let eml = initialOrcamento.cliente_email || '';

      if (!tel && !eml && initialOrcamento.cliente_contato) {
        const contato = initialOrcamento.cliente_contato;
        const emailMatch = contato.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          eml = emailMatch[0];
          const withoutEmail = contato.replace(emailMatch[0], '');
          const digits = withoutEmail.replace(/\D/g, '');
          if (digits) tel = formatTelefone(digits);
        } else {
          const digits = contato.replace(/\D/g, '');
          if (digits) tel = formatTelefone(digits);
          else eml = contato.trim();
        }
      }

      setClienteTelefone(tel);
      setClienteEmail(eml);
      setClienteEndereco(initialOrcamento.cliente_endereco || 'BLUMENAU / SC');
      setPrazoDias(initialOrcamento.prazo_dias || 10);
      setPrazoGarantia(initialOrcamento.prazo_garantia || '12 (doze) meses');
      setObjetivoCustom(initialOrcamento.objetivo || '');
      setObraId(initialOrcamento.obra_id || '');
      setStatus(initialOrcamento.status || 'rascunho');
      setObservacoes(initialOrcamento.observacoes || '');
      setNotas(initialOrcamento.notas || '');
      setValidadeDias(initialOrcamento.validade_dias || 15);
      setItens(
        (initialOrcamento.orcamento_itens || initialOrcamento.itens || []).map(it => ({
          servico_id: it.servico_id,
          material_id: it.material_id,
          servico_nome: it.descricao || it.servico_nome || 'Item',
          preco_unitario: Number(it.preco_unitario) || 0,
          quantidade: Number(it.quantidade) || 1,
          desconto_percentual: Number(it.desconto_percentual) || 0,
        }))
      );
      setStep(readOnlyView ? 2 : 1);
    } else {
      setClienteNome('');
      setClienteTelefone('');
      setClienteEmail('');
      setClienteEndereco('BLUMENAU / SC');
      setPrazoDias(10);
      setPrazoGarantia('12 (doze) meses');
      setObjetivoCustom('');
      setCondicoesPagamentoCustom('');
      setObraId('');
      setStatus('rascunho');
      setObservacoes('');
      setNotas('');
      setValidadeDias(15);
      setItens([]);
      setStep(1);
      setCurrentId(null);
    }
    setErrorMsg('');
  }, [initialOrcamento, readOnlyView, isOpen]);

  const handleAddServico = (servico) => {
    if (itens.find(i => i.servico_id === servico.id)) return;
    setItens(prev => [...prev, {
      servico_id: servico.id,
      material_id: null,
      servico_nome: servico.nome,
      preco_unitario: Number(servico.preco_total) || 0,
      quantidade: 1,
      desconto_percentual: 0,
    }]);
  };

  const handleAddMaterial = (material) => {
    if (itens.find(i => i.material_id === material.id)) return;
    setItens(prev => [...prev, {
      servico_id: null,
      material_id: material.id,
      servico_nome: material.nome,
      preco_unitario: Number(material.preco_medio) || 0,
      quantidade: 1,
      desconto_percentual: 0,
    }]);
  };

  const handleCreateMaterial = async () => {
    setSavingMaterial(true);
    try {
      const res = await api.post('/servicos/materiais', {
        nome: newMaterial.nome.trim(),
        unidade: newMaterial.unidade.trim() || 'ML',
        preco_medio: parseFloat(String(newMaterial.preco_medio).replace(',', '.')) || 0,
      });
      const created = res.data;
      if (onMaterialCreated) onMaterialCreated(created);
      handleAddMaterial(created);
      setNewMaterial({ nome: '', unidade: 'ML', preco_medio: '' });
      setShowNewMaterial(false);
    } catch (err) {
      console.error('Erro ao criar material', err);
      alert('Erro ao criar material. Verifique os dados.');
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleRemoveItem = (idx) => {
    setItens(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItem = (idx, field, value) => {
    setItens(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: parseFloat(value) || 0 } : item
    ));
  };

  const subtotalBruto = itens.reduce((sum, item) => sum + (item.preco_unitario * item.quantidade), 0);
  const totalDescontos = itens.reduce((sum, item) => sum + (item.preco_unitario * item.quantidade * (item.desconto_percentual / 100)), 0);
  const totalLiquido = subtotalBruto - totalDescontos;

  const handleSaveOrcamento = async (statusOverride = null) => {
    if (!clienteNome.trim()) {
      setErrorMsg('Por favor, informe o nome do cliente.');
      return;
    }
    if (clienteTelefone) {
      const digits = clienteTelefone.replace(/\D/g, '');
      if (digits.length < 10) {
        setErrorMsg('O telefone deve conter DDD e no mínimo 10 dígitos (ex: (11) 98765-4321).');
        return;
      }
    }
    if (clienteEmail && !isValidEmail(clienteEmail)) {
      setErrorMsg('Por favor, informe um endereço de e-mail válido (ex: cliente@email.com).');
      return;
    }
    if (itens.length === 0) {
      setErrorMsg('Adicione pelo menos um serviço ao orçamento.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const targetStatus = statusOverride || status;
      const contactParts = [];
      if (clienteTelefone.trim()) contactParts.push(clienteTelefone.trim());
      if (clienteEmail.trim()) contactParts.push(clienteEmail.trim());
      const combinedContato = contactParts.join(' • ');

      const payload = {
        obra_id: obraId || null,
        cliente_nome: clienteNome.trim(),
        cliente_contato: combinedContato || null,
        cliente_telefone: clienteTelefone.trim() || null,
        cliente_email: clienteEmail.trim() || null,
        cliente_endereco: clienteEndereco.trim() || null,
        prazo_dias: prazoDias,
        prazo_garantia: prazoGarantia,
        objetivo: objetivoCustom.trim() || null,
        validade_dias: validadeDias,
        status: targetStatus,
        observacoes: observacoes.trim() || null,
        notas: notas.trim() || null,
        itens: itens.map(i => ({
          servico_id: i.servico_id || null,
          material_id: i.material_id || null,
          descricao: i.servico_nome,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          desconto_percentual: i.desconto_percentual,
        }))
      };

      let res;
      if (currentId) {
        res = await api.put(`/servicos/orcamentos/${currentId}`, payload);
      } else {
        res = await api.post('/servicos/orcamentos', payload);
        setCurrentId(res.data.id);
      }
      if (onSaveSuccess) {
        onSaveSuccess(res.data, targetStatus === 'aprovado');
      }
      onClose();
    } catch (err) {
      setErrorMsg('Erro ao salvar orçamento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    // Se não preencheu nada, fecha direto
    if (!clienteNome && itens.length === 0 && !notas && !observacoes) {
      onClose();
      return;
    }

    try {
      setAutoSaving(true);
      const contactParts = [];
      if (clienteTelefone.trim()) contactParts.push(clienteTelefone.trim());
      if (clienteEmail.trim()) contactParts.push(clienteEmail.trim());
      const combinedContato = contactParts.join(' • ');

      const payload = {
        obra_id: obraId || null,
        cliente_nome: clienteNome.trim() || 'Rascunho de Orçamento',
        cliente_contato: combinedContato || null,
        cliente_telefone: clienteTelefone.trim() || null,
        cliente_email: clienteEmail.trim() || null,
        cliente_endereco: clienteEndereco.trim() || null,
        prazo_dias: prazoDias,
        prazo_garantia: prazoGarantia,
        objetivo: objetivoCustom.trim() || null,
        validade_dias: validadeDias,
        status: status,
        observacoes: observacoes.trim() || null,
        notas: notas.trim() || null,
        itens: itens.map(i => ({
          servico_id: i.servico_id || null,
          descricao: i.servico_nome,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          desconto_percentual: i.desconto_percentual,
        }))
      };

      if (currentId) {
        await api.put(`/servicos/orcamentos/${currentId}`, payload);
      } else {
        await api.post('/servicos/orcamentos', payload);
      }
      
      if (onSaveSuccess) onSaveSuccess(null, false);
      
    } catch (err) {
      console.warn('Erro ao salvar rascunho no fechamento', err);
    } finally {
      setAutoSaving(false);
      onClose();
    }
  };

  useEffect(() => {
    if (step !== 1 || readOnlyView) return;
    if (!clienteNome && itens.length === 0 && !notas && !observacoes) return;

    const timer = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const contactParts = [];
        if (clienteTelefone.trim()) contactParts.push(clienteTelefone.trim());
        if (clienteEmail.trim()) contactParts.push(clienteEmail.trim());
        const combinedContato = contactParts.join(' • ');

        const payload = {
          obra_id: obraId || null,
          cliente_nome: clienteNome.trim() || 'Rascunho de Orçamento',
          cliente_contato: combinedContato || null,
          cliente_telefone: clienteTelefone.trim() || null,
          cliente_email: clienteEmail.trim() || null,
          cliente_endereco: clienteEndereco.trim() || null,
          prazo_dias: prazoDias,
          prazo_garantia: prazoGarantia,
          objetivo: objetivoCustom.trim() || null,
          validade_dias: validadeDias,
          status: status,
          observacoes: observacoes.trim() || null,
          notas: notas.trim() || null,
          itens: itens.map(i => ({
            servico_id: i.servico_id || null,
            descricao: i.servico_nome,
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
            desconto_percentual: i.desconto_percentual,
          }))
        };

        if (currentId) {
          await api.put(`/servicos/orcamentos/${currentId}`, payload);
        } else {
          const res = await api.post('/servicos/orcamentos', payload);
          setCurrentId(res.data.id);
        }
      } catch (err) {
        console.warn('Erro no autosave', err);
      } finally {
        setAutoSaving(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [clienteNome, clienteTelefone, clienteEmail, clienteEndereco, prazoDias, prazoGarantia, objetivoCustom, validadeDias, status, observacoes, notas, itens, obraId, currentId, step, readOnlyView]);

  const selectedObra = obras.find(o => o.id === obraId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 2 ? 'Visualização da Proposta de Orçamento' : (initialOrcamento ? `Editar Orçamento #${initialOrcamento.numero || ''}` : 'Nova Proposta de Orçamento')}
      size={step === 2 ? 'xl' : 'lg'}
    >
      <div className="absolute top-4 right-12 text-xs text-slate-500 font-medium px-2">
        {autoSaving ? 'Salvando rascunho...' : (currentId ? 'Salvo' : '')}
      </div>
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          {/* Dados do Cliente e Obra */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Identificação do Orçamento
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Cliente *</label>
                <input
                  type="text"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Nome completo ou empresa"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Telefone / WhatsApp
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {clienteTelefone.replace(/\D/g, '').length}/11 dígitos
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    value={clienteTelefone}
                    onChange={(e) => setClienteTelefone(formatTelefone(e.target.value))}
                    maxLength={15}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono tracking-tight"
                  />
                  {clienteTelefone && (
                    <button
                      type="button"
                      onClick={() => setClienteTelefone('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      title="Limpar telefone"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    E-mail
                  </label>
                  <span className="text-[10px] text-slate-500">
                    {clienteEmail.length}/80 carac.
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={clienteEmail}
                    onChange={(e) => setClienteEmail(sanitizeEmail(e.target.value))}
                    maxLength={80}
                    placeholder="cliente@empresa.com.br"
                    className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  {clienteEmail && (
                    <button
                      type="button"
                      onClick={() => setClienteEmail('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      title="Limpar e-mail"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Endereço da Obra / Local</label>
                <input
                  type="text"
                  value={clienteEndereco}
                  onChange={(e) => setClienteEndereco(e.target.value)}
                  placeholder="Ex: BLUMENAU / SC ou Rua ABC, 123"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Vincular a uma Obra (Opcional)</label>
                <select
                  value={obraId}
                  onChange={(e) => setObraId(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  <option value="">Proposta Avulsa / Sem Obra Vinculada</option>
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.nome} ({o.cliente || 'Sem cliente'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Status da Proposta</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  <option value="rascunho">Rascunho (Em elaboração)</option>
                  <option value="enviado">Enviado ao Cliente</option>
                  <option value="aprovado">Aprovado pelo Cliente</option>
                  <option value="recusado">Recusado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Prazo de Realização (dias úteis)</label>
                <input
                  type="number"
                  min="1"
                  value={prazoDias}
                  onChange={(e) => setPrazoDias(parseInt(e.target.value) || 10)}
                  placeholder="10"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Garantia dos Serviços</label>
                <input
                  type="text"
                  value={prazoGarantia}
                  onChange={(e) => setPrazoGarantia(e.target.value)}
                  placeholder="Ex: 12 (doze) meses ou 5 (cinco) anos"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Validade da Proposta (dias corridos)</label>
                <input
                  type="number"
                  min="1"
                  value={validadeDias}
                  onChange={(e) => setValidadeDias(parseInt(e.target.value) || 15)}
                  placeholder="15"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Objetivo Específico (Opcional - se vazio, lista os nomes dos serviços)
                </label>
                <input
                  type="text"
                  value={objetivoCustom}
                  onChange={(e) => setObjetivoCustom(e.target.value)}
                  placeholder="Ex: Execução dos serviços de impermeabilização contemplando:"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Condições de Pagamento (Opcional)</label>
                <input
                  type="text"
                  value={condicoesPagamentoCustom}
                  onChange={(e) => setCondicoesPagamentoCustom(e.target.value)}
                  placeholder="Padrão: 50% entrada + 50% na conclusão"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Observações Adicionais</label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações contratuais adicionais..."
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                  Bloco de Notas Interno <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-normal">Apenas uso interno</span>
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Anotações internas (não aparecem no PDF e não alteram o valor)..."
                  rows={2}
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                />
              </div>
            </div>
          </div>

          {/* Seleção de Itens (Serviços e Insumos) */}
          <div>
            <h4 className="text-sm font-bold text-white mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Catálogo de Serviços e Insumos
              </span>
              <span className="text-xs text-slate-400 font-normal">Busque e adicione à proposta</span>
            </h4>
            
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={itemSearchTerm}
                  onChange={(e) => setItemSearchTerm(e.target.value)}
                  placeholder="Buscar serviço ou insumo..."
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div className="flex bg-slate-900/60 border border-slate-800 rounded-xl p-1">
                <button
                  onClick={() => setItemFilterType('todos')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${itemFilterType === 'todos' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setItemFilterType('servicos')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${itemFilterType === 'servicos' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Serviços
                </button>
                <button
                  onClick={() => setItemFilterType('insumos')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${itemFilterType === 'insumos' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Insumos
                </button>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 p-1 bg-slate-900/30 rounded-xl border border-slate-800">
              {(() => {
                const term = itemSearchTerm.toLowerCase();
                let filteredItems = [];
                
                if (itemFilterType === 'todos' || itemFilterType === 'servicos') {
                  const s = servicos.filter(x => x.nome.toLowerCase().includes(term) || (x.categoria || '').toLowerCase().includes(term));
                  filteredItems.push(...s.map(i => ({ ...i, tipo: 'Serviço' })));
                }
                
                if (itemFilterType === 'todos' || itemFilterType === 'insumos') {
                  const m = materiais.filter(x => x.nome.toLowerCase().includes(term));
                  filteredItems.push(...m.map(i => ({ ...i, tipo: 'Insumo' })));
                }

                if (filteredItems.length === 0) {
                  return <p className="text-xs text-slate-500 p-3 text-center">Nenhum item encontrado na busca.</p>;
                }

                return filteredItems.map(item => {
                  const isServico = item.tipo === 'Serviço';
                  const isAdded = isServico 
                    ? itens.some(i => i.servico_id === item.id)
                    : itens.some(i => i.material_id === item.id);
                  const preco = isServico ? item.preco_total : item.preco_medio;

                  return (
                    <button
                      key={`${item.tipo}-${item.id}`}
                      type="button"
                      onClick={() => isServico ? handleAddServico(item) : handleAddMaterial(item)}
                      disabled={isAdded}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-500/10 border border-emerald-500/30 opacity-60 cursor-default'
                          : 'hover:bg-slate-800/70 border border-transparent'
                      }`}
                    >
                      <div>
                        <span className="text-sm text-white font-medium">{item.nome}</span>
                        <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded ${isServico ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {item.tipo}
                        </span>
                        {isServico && item.categoria && (
                          <span className="text-[10px] text-slate-400 ml-1 px-1.5 py-0.5 rounded bg-slate-800">{item.categoria}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 font-semibold">{formatCurrency(preco)}</span>
                        {isAdded ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
            
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => setShowNewMaterial(!showNewMaterial)}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                + Cadastrar novo insumo
              </button>
            </div>

            {showNewMaterial && (
              <div className="mt-3 p-3 bg-slate-800/40 border border-emerald-500/30 rounded-xl relative">
                <button type="button" onClick={() => setShowNewMaterial(false)} className="absolute top-3 right-3 text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
                <h5 className="text-xs font-bold text-white mb-2">Novo Insumo Direto</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Nome do Insumo</label>
                    <input
                      type="text"
                      value={newMaterial.nome}
                      onChange={(e) => setNewMaterial(p => ({ ...p, nome: e.target.value }))}
                      placeholder="Ex: Cimento 50kg"
                      className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Unidade</label>
                    <select
                      value={newMaterial.unidade}
                      onChange={(e) => setNewMaterial(p => ({ ...p, unidade: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      {['ML', 'M²', 'M³', 'Unidade'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] text-slate-400 mb-1">Preço Médio (R$)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={newMaterial.preco_medio}
                      onChange={(e) => setNewMaterial(p => ({ ...p, preco_medio: e.target.value }))}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleCreateMaterial}
                    disabled={!newMaterial.nome.trim() || savingMaterial}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {savingMaterial ? 'Salvando...' : 'Salvar e Adicionar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Itens do Orçamento */}
          {itens.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                <span>Composição da Proposta ({itens.length} {itens.length === 1 ? 'item' : 'itens'})</span>
                <span className="text-xs text-slate-400 font-normal">Ajuste quantitativo e desconto</span>
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {itens.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-white truncate block">{item.servico_nome}</span>
                      <span className="text-[11px] text-slate-400">Unitário: {formatCurrency(item.preco_unitario)}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div>
                        <label className="text-[10px] text-slate-500 block uppercase font-semibold">Quantidade</label>
                        <input
                          type="number" step="0.01" min="0.01"
                          value={item.quantidade}
                          onChange={(e) => handleUpdateItem(idx, 'quantidade', e.target.value)}
                          className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block uppercase font-semibold">Desconto %</label>
                        <input
                          type="number" step="0.5" min="0" max="100"
                          value={item.desconto_percentual}
                          onChange={(e) => handleUpdateItem(idx, 'desconto_percentual', e.target.value)}
                          className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                        />
                      </div>
                      <div className="text-right min-w-[90px]">
                        <label className="text-[10px] text-slate-500 block uppercase font-semibold">Subtotal</label>
                        <span className="text-xs font-bold text-emerald-400">
                          {formatCurrency(item.preco_unitario * item.quantidade * (1 - (item.desconto_percentual || 0) / 100))}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totalizador */}
              <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Subtotal Bruto</span>
                    <span className="text-sm font-semibold text-slate-300">{formatCurrency(subtotalBruto)}</span>
                  </div>
                  {totalDescontos > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-red-400 block">Descontos</span>
                      <span className="text-sm font-semibold text-red-400">-{formatCurrency(totalDescontos)}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 block font-bold">Valor Total da Proposta</span>
                  <span className="text-2xl font-black text-emerald-400">{formatCurrency(totalLiquido)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Ações do Modal */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={itens.length === 0 || !clienteNome.trim()}
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-blue-400" />
                <span>Pré-visualizar PDF</span>
              </button>
              <button
                type="button"
                disabled={saving || itens.length === 0 || !clienteNome.trim()}
                onClick={() => handleSaveOrcamento()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Salvando...' : 'Salvar Proposta'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <PropostaComercialPreviewModal
          data={{
            clienteNome,
            clienteEndereco,
            clienteTelefone,
            clienteEmail,
            clienteContato: [clienteTelefone, clienteEmail].filter(Boolean).join(' • '),
            dataEmissao: initialOrcamento?.created_at
              ? new Date(initialOrcamento.created_at).toLocaleDateString('pt-BR')
              : new Date().toLocaleDateString('pt-BR'),
            itens,
            valorTotal: totalLiquido,
            validadeDias,
            prazoDias,
            prazoGarantia,
            objetivoCustom,
            observacoesCustom: observacoes,
            condicoesPagamentoCustom,
          }}
          onClose={onClose}
          onBackToEdit={() => setStep(1)}
          readOnlyView={readOnlyView}
          onSave={!readOnlyView ? () => handleSaveOrcamento() : null}
          saving={saving}
        />
      )}
    </Modal>
  );
}


// ========================================
// ========================================
// Componente Principal
// ========================================
export default function ServicosPage() {
  const [activeSubTab, setActiveSubTab] = useState('orcamentos'); // 'orcamentos' ou 'servicos'
  const [servicos, setServicos] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Filtros de Serviços
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');

  // Filtros de Orçamentos
  const [orcamentoSearch, setOrcamentoSearch] = useState('');
  const [orcamentoStatusFilter, setOrcamentoStatusFilter] = useState('');
  const [orcamentoObraFilter, setOrcamentoObraFilter] = useState('');

  // Modais
  const [showForm, setShowForm] = useState(false);
  const [editingServico, setEditingServico] = useState(null);
  const [showOrcamento, setShowOrcamento] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState(null);
  const [readOnlyViewOrcamento, setReadOnlyViewOrcamento] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showDeleteOrcamentoConfirm, setShowDeleteOrcamentoConfirm] = useState(null);

  // Stats de Serviços
  const stats = useMemo(() => {
    const total = servicos.length;
    const precoMedio = total > 0 ? servicos.reduce((s, sv) => s + (sv.preco_total || 0), 0) / total : 0;
    const categoriasUnicas = [...new Set(servicos.map(s => s.categoria).filter(Boolean))];
    const totalComposicoes = servicos.reduce((s, sv) => s + (sv.servico_materiais?.length || 0), 0);
    return { total, precoMedio, categoriasUnicas: categoriasUnicas.length, totalComposicoes };
  }, [servicos]);

  // Stats de Orçamentos
  const orcamentoStats = useMemo(() => {
    const total = orcamentos.length;
    const volumeTotal = orcamentos.reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0);
    const aprovados = orcamentos.filter(o => o.status === 'aprovado');
    const valorAprovado = aprovados.reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0);
    const taxaConversao = total > 0 ? (aprovados.length / total) * 100 : 0;
    const emNegociacao = orcamentos.filter(o => o.status === 'enviado' || o.status === 'rascunho');
    const valorEmNegociacao = emNegociacao.reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0);

    return {
      total,
      volumeTotal,
      aprovadosCount: aprovados.length,
      valorAprovado,
      taxaConversao,
      emNegociacaoCount: emNegociacao.length,
      valorEmNegociacao
    };
  }, [orcamentos]);

  // Fetch dados completo
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [servicosRes, materiaisRes, categoriasRes, orcamentosRes, obrasRes] = await Promise.allSettled([
        api.get('/servicos'),
        api.get('/servicos/materiais'),
        api.get('/servicos/categorias'),
        api.get('/servicos/orcamentos'),
        api.get('/obras'),
      ]);

      if (servicosRes.status === 'fulfilled') setServicos(servicosRes.value.data || []);
      if (materiaisRes.status === 'fulfilled') setMateriais(materiaisRes.value.data || []);
      if (categoriasRes.status === 'fulfilled') setCategorias(categoriasRes.value.data || []);
      if (orcamentosRes.status === 'fulfilled') setOrcamentos(orcamentosRes.value.data || []);
      if (obrasRes.status === 'fulfilled') setObras(obrasRes.value.data || []);
    } catch (err) {
      console.log('Operando com dados locais:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrar serviços
  const filteredServicos = useMemo(() => {
    return servicos.filter(s => {
      const matchSearch = !searchTerm ||
        s.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategoria = !categoriaFilter || s.categoria === categoriaFilter;
      return matchSearch && matchCategoria;
    });
  }, [servicos, searchTerm, categoriaFilter]);

  // Filtrar orçamentos
  const filteredOrcamentos = useMemo(() => {
    return orcamentos.filter(o => {
      const matchSearch = !orcamentoSearch ||
        o.cliente_nome?.toLowerCase().includes(orcamentoSearch.toLowerCase()) ||
        o.numero?.toLowerCase().includes(orcamentoSearch.toLowerCase()) ||
        o.cliente_contato?.toLowerCase().includes(orcamentoSearch.toLowerCase()) ||
        o.cliente_telefone?.toLowerCase().includes(orcamentoSearch.toLowerCase()) ||
        o.cliente_email?.toLowerCase().includes(orcamentoSearch.toLowerCase());
      const matchStatus = !orcamentoStatusFilter || o.status === orcamentoStatusFilter;
      const matchObra = !orcamentoObraFilter || o.obra_id === orcamentoObraFilter;
      return matchSearch && matchStatus && matchObra;
    });
  }, [orcamentos, orcamentoSearch, orcamentoStatusFilter, orcamentoObraFilter]);

  // Handlers de Serviços
  const handleSaveServico = async (data) => {
    setSaving(true);
    try {
      if (editingServico?.id && !editingServico.id.startsWith('s0')) {
        await api.put(`/servicos/${editingServico.id}`, data);
        setToast({ message: 'Serviço atualizado com sucesso!', type: 'success' });
      } else {
        await api.post('/servicos', data);
        setToast({ message: 'Serviço criado com sucesso!', type: 'success' });
      }
      await fetchData();
      setShowForm(false);
      setEditingServico(null);
    } catch (err) {
      setToast({ message: 'Erro ao salvar serviço. Verifique os dados.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteServico = async (servico) => {
    try {
      if (servico.id && !servico.id.startsWith('s0')) {
        await api.delete(`/servicos/${servico.id}`);
      }
      setServicos(prev => prev.filter(s => s.id !== servico.id));
      setToast({ message: 'Serviço removido com sucesso.', type: 'success' });
      setShowDeleteConfirm(null);
    } catch (err) {
      setToast({ message: 'Erro ao remover serviço.', type: 'error' });
    }
  };

  const handleDuplicate = (servico) => {
    const duplicated = {
      ...servico,
      nome: `${servico.nome} (Cópia)`,
      id: undefined,
      servico_materiais: servico.servico_materiais || [],
    };
    setEditingServico(duplicated);
    setShowForm(true);
  };

  const handleEdit = (servico) => {
    setEditingServico(servico);
    setShowForm(true);
  };

  const handleNewServico = () => {
    setEditingServico(null);
    setShowForm(true);
  };

  // Handlers de Orçamento
  const handleNewOrcamento = () => {
    setSelectedOrcamento(null);
    setReadOnlyViewOrcamento(false);
    setShowOrcamento(true);
  };

  const handleViewOrcamento = (orc) => {
    setSelectedOrcamento(orc);
    setReadOnlyViewOrcamento(true);
    setShowOrcamento(true);
  };

  const handleEditOrcamento = (orc) => {
    setSelectedOrcamento(orc);
    setReadOnlyViewOrcamento(false);
    setShowOrcamento(true);
  };

  const handleUpdateOrcamentoStatus = async (orcId, newStatus) => {
    try {
      await api.patch(`/servicos/orcamentos/${orcId}/status`, { status: newStatus });
      setOrcamentos(prev => prev.map(o => o.id === orcId ? { ...o, status: newStatus } : o));
      if (newStatus === 'aprovado') {
        setToast({
          message: 'Orçamento marcado como Aprovado! Orçamento da obra sincronizado.',
          type: 'success'
        });
      } else {
        setToast({
          message: `Status atualizado para "${newStatus}".`,
          type: 'info'
        });
      }
    } catch (err) {
      setToast({ message: 'Erro ao atualizar status do orçamento.', type: 'error' });
    }
  };

  const handleDeleteOrcamento = async (orc) => {
    try {
      await api.delete(`/servicos/orcamentos/${orc.id}`);
      setOrcamentos(prev => prev.filter(o => o.id !== orc.id));
      setToast({ message: 'Orçamento excluído com sucesso.', type: 'success' });
      setShowDeleteOrcamentoConfirm(null);
    } catch (err) {
      setToast({ message: 'Erro ao excluir orçamento.', type: 'error' });
    }
  };

  const handleOrcamentoSaved = (savedOrc, isApproved) => {
    fetchData();
    setToast({
      message: isApproved
        ? 'Orçamento salvo e Aprovado com sucesso! Obra atualizada.'
        : 'Orçamento salvo e registrado com sucesso!',
      type: 'success'
    });
  };

  const allCategorias = useMemo(() => {
    const fromServicos = servicos.map(s => s.categoria).filter(Boolean);
    const merged = [...new Set([...categorias, ...fromServicos, ...CATEGORIAS_PADRAO])];
    merged.sort();
    return merged;
  }, [servicos, categorias]);

  const getStatusBadge = (st) => {
    switch (st) {
      case 'aprovado':
        return { label: 'Aprovado', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle };
      case 'enviado':
        return { label: 'Enviado', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Send };
      case 'recusado':
        return { label: 'Recusado', bg: 'bg-red-500/10 text-red-400 border-red-500/30', icon: XCircle };
      default:
        return { label: 'Rascunho', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Clock };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Título e Ações Globais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Serviços & Orçamentos</h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestão de propostas comerciais, acompanhamento de status de aprovação e composição de serviços.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeSubTab === 'orcamentos' ? (
            <button
              onClick={handleNewOrcamento}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Orçamento</span>
            </button>
          ) : (
            <button
              onClick={handleNewServico}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Serviço</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs de Navegação */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('orcamentos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeSubTab === 'orcamentos'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Orçamentos & Propostas</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
            {orcamentos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('servicos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeSubTab === 'servicos'
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Catálogo de Serviços & Insumos</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
            {servicos.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: ORÇAMENTOS & PROPOSTAS PERSISTIDAS */}
      {/* ============================================================== */}
      {activeSubTab === 'orcamentos' && (
        <div className="space-y-6">
          {/* KPIs de Orçamento */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Total de Orçamentos',
                value: `${orcamentoStats.total} propostas`,
                icon: FileSpreadsheet,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/20'
              },
              {
                label: 'Volume Total Orçado',
                value: formatCurrency(orcamentoStats.volumeTotal),
                icon: DollarSign,
                color: 'text-slate-200',
                bg: 'bg-slate-800/60',
                border: 'border-slate-700/50'
              },
              {
                label: 'Orçamentos Aprovados',
                value: formatCurrency(orcamentoStats.valorAprovado),
                sub: `${orcamentoStats.aprovadosCount} aprovados (${orcamentoStats.taxaConversao.toFixed(0)}% conversão)`,
                icon: CheckCircle,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/20'
              },
              {
                label: 'Em Negociação / Rascunho',
                value: formatCurrency(orcamentoStats.valorEmNegociacao),
                sub: `${orcamentoStats.emNegociacaoCount} pendentes`,
                icon: Clock,
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/20'
              },
            ].map((kpi, idx) => (
              <div key={idx} className={`glass-card rounded-2xl p-4 border ${kpi.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">{kpi.label}</p>
                <p className={`text-lg font-bold ${kpi.color} mt-0.5`}>{kpi.value}</p>
                {kpi.sub && <p className="text-[10px] text-slate-500 mt-1 font-medium">{kpi.sub}</p>}
              </div>
            ))}
          </div>

          {/* Barra de Busca e Filtros de Orçamento */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={orcamentoSearch}
                onChange={(e) => setOrcamentoSearch(e.target.value)}
                placeholder="Buscar por cliente, número (#ORC) ou contato..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="relative">
              <select
                value={orcamentoStatusFilter}
                onChange={(e) => setOrcamentoStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer min-w-[170px]"
              >
                <option value="">Todos os status</option>
                <option value="aprovado">Aprovados</option>
                <option value="enviado">Enviados</option>
                <option value="rascunho">Rascunhos</option>
                <option value="recusado">Recusados</option>
              </select>
            </div>

            <div className="relative">
              <select
                value={orcamentoObraFilter}
                onChange={(e) => setOrcamentoObraFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer min-w-[180px]"
              >
                <option value="">Todas as obras</option>
                {obras.map(o => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de Orçamentos */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                <p className="text-sm text-slate-400">Carregando orçamentos...</p>
              </div>
            </div>
          ) : filteredOrcamentos.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredOrcamentos.map((orc) => {
                const badge = getStatusBadge(orc.status);
                const BadgeIcon = badge.icon;
                const obraVinculada = obras.find(o => o.id === orc.obra_id);
                const dataFormatada = orc.created_at
                  ? new Date(orc.created_at).toLocaleDateString('pt-BR')
                  : 'Data não informada';

                return (
                  <div
                    key={orc.id}
                    className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-slate-700/80 transition-all group"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Lado Esquerdo: Identificação & Cliente */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {orc.numero || '#ORC'}
                          </span>

                          {obraVinculada ? (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {obraVinculada.nome}
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                              Proposta Avulsa
                            </span>
                          )}

                          <span className="text-[11px] text-slate-500">
                            Criado em {dataFormatada} • Validade: {orc.validade_dias || 30} dias
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white mb-1">{orc.cliente_nome}</h3>
                        {(orc.cliente_telefone || orc.cliente_email || orc.cliente_contato) && (
                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3 mb-2">
                            {orc.cliente_telefone && (
                              <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                                <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                                {orc.cliente_telefone}
                              </span>
                            )}
                            {orc.cliente_email && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-300">
                                <Mail className="w-3 h-3 text-blue-400 shrink-0" />
                                {orc.cliente_email}
                              </span>
                            )}
                            {!orc.cliente_telefone && !orc.cliente_email && orc.cliente_contato && (
                              <span>{orc.cliente_contato}</span>
                            )}
                          </div>
                        )}

                        {orc.itens && orc.itens.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {orc.itens.slice(0, 3).map((it, idx) => (
                              <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50">
                                {it.descricao} ({it.quantidade} un)
                              </span>
                            ))}
                            {orc.itens.length > 3 && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/40 text-slate-500">
                                +{orc.itens.length - 3} mais
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Centro: Valores */}
                      <div className="flex items-center gap-6 lg:text-right shrink-0">
                        {orc.desconto_total > 0 && (
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Subtotal</span>
                            <span className="text-xs text-slate-400 line-through">{formatCurrency(orc.subtotal)}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Valor Total</span>
                          <span className="text-xl font-black text-emerald-400">{formatCurrency(orc.valor_total)}</span>
                        </div>
                      </div>

                      {/* Lado Direito: Status Dropdown & Ações */}
                      <div className="flex items-center gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                        {/* Seletor rápido de Status */}
                        <div className="relative">
                          <select
                            value={orc.status}
                            onChange={(e) => handleUpdateOrcamentoStatus(orc.id, e.target.value)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer appearance-none pr-7 focus:outline-none transition-all ${badge.bg}`}
                          >
                            <option value="rascunho">Rascunho</option>
                            <option value="enviado">Enviado</option>
                            <option value="aprovado">Aprovado</option>
                            <option value="recusado">Recusado</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>

                        {/* Botão Visualizar Proposta */}
                        <button
                          onClick={() => handleViewOrcamento(orc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                          title="Visualizar Proposta / Imprimir PDF"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>PDF</span>
                        </button>

                        {/* Botão Impressão Rápida Direta */}
                        <button
                          onClick={() => printPropostaComercial({
                            clienteNome: orc.cliente_nome,
                            clienteEndereco: orc.cliente_endereco || 'BLUMENAU',
                            clienteTelefone: orc.cliente_telefone,
                            clienteEmail: orc.cliente_email,
                            clienteContato: orc.cliente_contato,
                            dataEmissao: new Date(orc.created_at || Date.now()).toLocaleDateString('pt-BR'),
                            itens: (orc.itens || []).map(i => ({
                              servico_nome: i.descricao || i.servico_nome || 'Serviço',
                              quantidade: Number(i.quantidade) || 1,
                              preco_unitario: Number(i.preco_unitario) || 0,
                              desconto_percentual: Number(i.desconto_percentual) || 0,
                            })),
                            valorTotal: Number(orc.valor_total) || 0,
                            validadeDias: orc.validade_dias || 15,
                            prazoDias: orc.prazo_dias || 10,
                            prazoGarantia: orc.prazo_garantia || '12 (doze) meses',
                            objetivoCustom: orc.objetivo || '',
                            observacoesCustom: orc.observacoes || '',
                          })}
                          className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all cursor-pointer"
                          title="Impressão Rápida / Salvar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Botão Editar Proposta */}
                        <button
                          onClick={() => handleEditOrcamento(orc)}
                          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all cursor-pointer"
                          title="Editar Proposta"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Botão Excluir */}
                        <button
                          onClick={() => setShowDeleteOrcamentoConfirm(orc)}
                          className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                          title="Excluir Orçamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-2xl border border-slate-800">
              <FileSpreadsheet className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-lg font-semibold text-slate-300 mb-1">
                {orcamentoSearch || orcamentoStatusFilter || orcamentoObraFilter
                  ? 'Nenhum orçamento encontrado com esses filtros'
                  : 'Nenhum orçamento cadastrado ainda'}
              </h3>
              <p className="text-sm text-slate-500 mb-4 max-w-md">
                {orcamentoSearch || orcamentoStatusFilter || orcamentoObraFilter
                  ? 'Tente limpar a busca ou selecionar outro status.'
                  : 'Crie uma nova proposta selecionando serviços do catálogo e personalize dados do cliente.'}
              </p>
              <button
                onClick={handleNewOrcamento}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Primeiro Orçamento</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: CATÁLOGO DE SERVIÇOS & INSUMOS (Composição Técnica) */}
      {/* ============================================================== */}
      {activeSubTab === 'servicos' && (
        <div className="space-y-6">
          {/* KPIs de Serviços */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total de Serviços', value: stats.total, icon: Layers, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
              { label: 'Preço Médio', value: formatCurrency(stats.precoMedio), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
              { label: 'Categorias', value: stats.categoriasUnicas, icon: Tag, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
              { label: 'Composições', value: stats.totalComposicoes, icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            ].map((kpi, idx) => (
              <div key={idx} className={`glass-card rounded-xl p-4 border ${kpi.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">{kpi.label}</p>
                <p className={`text-lg font-bold ${kpi.color} mt-0.5`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar serviço por nome ou descrição..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer appearance-none min-w-[200px]"
              >
                <option value="">Todas as categorias</option>
                {allCategorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de Serviços */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                <p className="text-sm text-slate-400">Carregando serviços...</p>
              </div>
            </div>
          ) : filteredServicos.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredServicos.map((servico) => (
                <ServicoCard
                  key={servico.id}
                  servico={servico}
                  onEdit={handleEdit}
                  onDelete={(s) => setShowDeleteConfirm(s)}
                  onDuplicate={handleDuplicate}
                  onViewDetails={() => {}}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-2xl border border-slate-800">
              <FileSpreadsheet className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-lg font-semibold text-slate-400 mb-1">
                {searchTerm || categoriaFilter ? 'Nenhum serviço encontrado' : 'Catálogo vazio'}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {searchTerm || categoriaFilter
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Crie seu primeiro serviço para começar a compor orçamentos.'}
              </p>
              {!searchTerm && !categoriaFilter && (
                <button
                  onClick={handleNewServico}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Primeiro Serviço</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de Criar/Editar Serviço */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingServico(null); }}
        title={editingServico ? 'Editar Serviço' : 'Novo Serviço'}
        size="lg"
      >
        <ServicoForm
          servico={editingServico}
          materiais={materiais}
          onSave={handleSaveServico}
          onCancel={() => { setShowForm(false); setEditingServico(null); }}
          isLoading={saving}
        />
      </Modal>

      {/* Modal de Orçamento Persistente */}
      <OrcamentoModal
        isOpen={showOrcamento}
        onClose={() => { setShowOrcamento(false); setSelectedOrcamento(null); }}
        servicos={servicos}
        materiais={materiais}
        obras={obras}
        onSaveSuccess={handleOrcamentoSaved}
        onMaterialCreated={(newMat) => setMateriais(prev => [...prev, newMat])}
        initialOrcamento={selectedOrcamento}
        readOnlyView={readOnlyViewOrcamento}
      />

      {/* Modal de Confirmação de Exclusão de Serviço */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Confirmar Exclusão do Serviço"
        size="sm"
      >
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-sm text-slate-300">
              Tem certeza que deseja excluir o serviço
            </p>
            <p className="text-sm font-bold text-white mt-1">"{showDeleteConfirm?.nome}"?</p>
            <p className="text-xs text-slate-500 mt-2">Todos os materiais vinculados também serão removidos. Esta ação não pode ser desfeita.</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleDeleteServico(showDeleteConfirm)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 transition-all cursor-pointer"
            >
              Sim, Excluir
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação de Exclusão de Orçamento */}
      <Modal
        isOpen={!!showDeleteOrcamentoConfirm}
        onClose={() => setShowDeleteOrcamentoConfirm(null)}
        title="Excluir Proposta de Orçamento"
        size="sm"
      >
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-sm text-slate-300">
              Tem certeza que deseja excluir o orçamento
            </p>
            <p className="text-sm font-bold text-white mt-1">
              "{showDeleteOrcamentoConfirm?.numero} - {showDeleteOrcamentoConfirm?.cliente_nome}"?
            </p>
            <p className="text-xs text-slate-500 mt-2">Esta proposta será permanentemente removida do sistema.</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowDeleteOrcamentoConfirm(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleDeleteOrcamento(showDeleteOrcamentoConfirm)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 transition-all cursor-pointer"
            >
              Sim, Excluir
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style>{`
        .animate-in {
          animation: slideIn 0.2s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}


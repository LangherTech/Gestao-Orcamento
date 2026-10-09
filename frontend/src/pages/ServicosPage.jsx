import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet, Plus, Sparkles, FileText, Layers, Tag, X,
  Search, Filter, ChevronDown, ChevronUp, Trash2, Edit3,
  Package, DollarSign, Percent, Wrench, Eye, Save, ArrowLeft,
  Calculator, AlertCircle, CheckCircle, Copy, Download,
  Building2, Check, Clock, Send, XCircle, Phone, Mail, RotateCcw
} from 'lucide-react';
import api from '../services/api';
import { PropostaComercialPreviewModal, printPropostaComercial, printListaMateriais } from '../components/PropostaComercialView';
import AssistenteDrywallModal from '../components/AssistenteDrywallModal';


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
  'Drywall',
  'Alvenaria',
];

const UNIDADES_SERVICO = [
  { value: 'm²', label: 'm² — Metro Quadrado' },
  { value: 'ml', label: 'ml — Metro Linear' },
  { value: 'm³', label: 'm³ — Metro Cúbico' },
  { value: 'un', label: 'un — Unidade' },
  { value: 'vb', label: 'vb — Verba / Global' },
  { value: 'pt', label: 'pt — Ponto' },
  { value: 'dia', label: 'dia — Diária' },
  { value: 'hr', label: 'hr — Hora' },
  { value: 'kg', label: 'kg — Quilograma' },
  { value: 'cj', label: 'cj — Conjunto' },
];

const UNIDADES_INSUMO_PADRAO = [
  { value: 'M²', label: 'M² — Metro Quadrado' },
  { value: 'Ml', label: 'Ml — Metro Linear' },
  { value: 'M³', label: 'M³ — Metro Cúbico' },
  { value: 'Un', label: 'Un — Unidade' },
  { value: 'Kg', label: 'Kg — Quilograma' },
  { value: 'Sc', label: 'Sc — Saco' },
  { value: 'Lt', label: 'Lt — Litro / Lata' },
  { value: 'Br', label: 'Br — Barra' },
  { value: 'Rl', label: 'Rl — Rolo' },
  { value: 'Cx', label: 'Cx — Caixa' },
  { value: 'Vb', label: 'Vb — Verba' },
];

const UNIDADES_INSUMO = [
  'Ml', 'M²', 'M³', 'Un'
];

const FALLBACK_MATERIAIS = [
  { id: 'm001', nome: 'Placa Drywall Standard ST 12.5mm', unidade: 'M²', preco_medio: 22.50 },
  { id: 'm002', nome: 'Perfil Guia 70mm', unidade: 'Br', preco_medio: 18.90 },
  { id: 'm003', nome: 'Perfil Montante 70mm', unidade: 'Br', preco_medio: 17.50 },
  { id: 'm004', nome: 'Massa de Acabamento para Gesso', unidade: 'Sc', preco_medio: 42.00 },
  { id: 'm005', nome: 'Tinta Acrílica Premium Suvinil 18L', unidade: 'Lt', preco_medio: 320.00 },
  { id: 'm006', nome: 'Fundo Preparador 18L', unidade: 'Lt', preco_medio: 95.00 },
  { id: 'm007', nome: 'Lixa para Parede 100', unidade: 'Un', preco_medio: 2.50 },
  { id: 'm008', nome: 'Fita Telada Adesiva 50mm', unidade: 'Rl', preco_medio: 14.00 },
  { id: 'm009', nome: 'Arame Galvanizado 18', unidade: 'Kg', preco_medio: 18.00 },
  { id: 'm010', nome: 'Gesso Cola 1kg', unidade: 'Sc', preco_medio: 8.50 },
  { id: 'm011', nome: 'Cimento Portland CP-II (50kg)', unidade: 'Sc', preco_medio: 34.90 },
  { id: 'm012', nome: 'Argamassa AC-II (20kg)', unidade: 'Sc', preco_medio: 26.50 },
  { id: 'm013', nome: 'Areia Média', unidade: 'M³', preco_medio: 110.00 }
];

const FALLBACK_SERVICOS = [
  {
    id: 's001',
    obra_id: null,
    nome: 'Parede Drywall Standard (120mm)',
    descricao: 'Parede em drywall com estrutura metálica 70mm e placa ST 12.5mm em ambos os lados.',
    categoria: 'Gesso e Drywall',
    preco_total: 145.00,
    margem_lucro: 25.00,
    mao_de_obra: 45.00
  },
  {
    id: 's002',
    obra_id: null,
    nome: 'Pintura Acrílica Interna (2 Demãos)',
    descricao: 'Aplicação de selador e 2 demãos de tinta acrílica premium em paredes internas.',
    categoria: 'Pintura e Acabamento',
    preco_total: 35.00,
    margem_lucro: 30.00,
    mao_de_obra: 22.00
  },
  {
    id: 's003',
    obra_id: null,
    nome: 'Assentamento de Piso Porcelanato',
    descricao: 'Instalação de porcelanato com argamassa colante AC-III e rejuntamento.',
    categoria: 'Pisos e Revestimentos',
    preco_total: 85.00,
    margem_lucro: 20.00,
    mao_de_obra: 55.00
  }
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
  const custoTerceiro = Number(servico.mao_de_obra) || 0;
  const custoTotal = custoTerceiro;
  const precoVenda = Number(servico.preco_total) || 0;
  const lucroBruto = precoVenda - custoTotal;
  const margemReal = precoVenda > 0 ? (lucroBruto / precoVenda) * 100 : Number(servico.margem_lucro) || 0;
  const unidadeSigla = servico.unidade || "Un";

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
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {unidadeSigla}
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
          <div className="flex items-center gap-5 md:text-right shrink-0 flex-wrap sm:flex-nowrap">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Preço de Venda</span>
              <span className="text-lg font-bold text-emerald-400">
                {formatCurrency(precoVenda)}
                <span className="text-xs font-normal text-emerald-500/70 ml-1">/ {unidadeSigla}</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Custo Terceiro</span>
              <span className="text-sm font-semibold text-slate-200">{formatCurrency(custoTerceiro)}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Lucro Bruto</span>
              <span className={`text-sm font-bold ${lucroBruto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {lucroBruto >= 0 ? '+' : ''}{formatCurrency(lucroBruto)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Margem</span>
              <span className="text-sm font-semibold text-purple-300">{formatPercent(margemReal)}</span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-800/60">
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
    </div>
  );
}

// ========================================
// Formulário de Serviço (Criar/Editar)
// ========================================
function ServicoForm({ servico, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    unidade: 'm²',
    preco_total: 0,
    margem_lucro: 0,
    mao_de_obra: 0,
    ...servico,
  });

  const isCustomUnitInit = Boolean(
    servico?.unidade &&
    !UNIDADES_SERVICO.some(u => u.value.toLowerCase() === String(servico.unidade).toLowerCase())
  );
  const [customUnidadeMode, setCustomUnidadeMode] = useState(isCustomUnitInit);

  const custoTerceiro = Number(form.mao_de_obra) || 0;
  const custoTotalDireto = custoTerceiro;
  const precoVenda = Number(form.preco_total) || 0;
  const lucroBruto = precoVenda - custoTotalDireto;
  const margemSobreVenda = precoVenda > 0 ? (lucroBruto / precoVenda) * 100 : 0;
  const markupSobreCusto = custoTotalDireto > 0 ? (lucroBruto / custoTotalDireto) * 100 : 0;

  // Handlers bidirecionais
  const handleMaoDeObraChange = (val) => {
    const valNum = parseFloat(val) || 0;
    const novoCustoTotal = valNum;
    setForm(prev => {
      const pv = Number(prev.preco_total) || 0;
      let novaMargem = Number(prev.margem_lucro) || 0;
      if (pv > 0) {
        novaMargem = Math.round(((pv - novoCustoTotal) / pv) * 1000) / 10;
      }
      return {
        ...prev,
        mao_de_obra: valNum,
        margem_lucro: novaMargem
      };
    });
  };

  const handlePrecoVendaChange = (val) => {
    const valNum = parseFloat(val) || 0;
    setForm(prev => {
      const ct = (Number(prev.mao_de_obra) || 0);
      const novaMargem = valNum > 0 ? Math.round(((valNum - ct) / valNum) * 1000) / 10 : 0;
      return {
        ...prev,
        preco_total: valNum,
        margem_lucro: novaMargem
      };
    });
  };

  const handleMargemChange = (val) => {
    const valNum = parseFloat(val) || 0;
    setForm(prev => {
      const ct = (Number(prev.mao_de_obra) || 0);
      let novoPreco = prev.preco_total;
      if (valNum < 100 && ct > 0) {
        novoPreco = Math.round((ct / (1 - (valNum / 100))) * 100) / 100;
      }
      return {
        ...prev,
        margem_lucro: valNum,
        preco_total: novoPreco
      };
    });
  };

  const handleApplyMarkup = (markupPercent) => {
    const ct = (Number(form.mao_de_obra) || 0);
    const novoPreco = Math.round(ct * (1 + markupPercent / 100) * 100) / 100;
    const novaMargem = novoPreco > 0 ? Math.round(((novoPreco - ct) / novoPreco) * 1000) / 10 : 0;
    setForm(prev => ({
      ...prev,
      preco_total: novoPreco,
      margem_lucro: novaMargem
    }));
  };

  const handleSubmit = () => {
    onSave(form);
  };

  return (
    <div className="space-y-6">
      {/* 1. Dados Básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nome do Serviço *</label>
          <input
            type="text"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Instalação de Porcelanato 60x60"
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium"
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
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Unidade de Medida
          </label>
          {customUnidadeMode ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={form.unidade || ''}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                className="flex-1 bg-slate-800/60 border border-emerald-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Ex: kit, par, cx..."
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setCustomUnidadeMode(false);
                  setForm({ ...form, unidade: 'm²' });
                }}
                className="px-3 py-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-all font-medium"
                title="Voltar para a lista padrão"
              >
                Lista
              </button>
            </div>
          ) : (
            <select
              value={
                UNIDADES_SERVICO.some(u => u.value.toLowerCase() === (form.unidade || '').toLowerCase())
                  ? UNIDADES_SERVICO.find(u => u.value.toLowerCase() === (form.unidade || '').toLowerCase()).value
                  : '__custom__'
              }
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setCustomUnidadeMode(true);
                  setForm({ ...form, unidade: '' });
                } else {
                  setForm({ ...form, unidade: e.target.value });
                }
              }}
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer font-semibold"
            >
              {UNIDADES_SERVICO.map(u => (
                <option key={u.value} value={u.value} className="bg-slate-900 text-white py-1">
                  {u.label}
                </option>
              ))}
              <option value="__custom__" className="bg-slate-900 text-emerald-400 py-1">
                + Outra unidade (personalizada)...
              </option>
            </select>
          )}
          <span className="text-[10px] text-slate-500 mt-1 block">
            {customUnidadeMode 
              ? 'Digite a sigla da unidade desejada ou clique em "Lista" para voltar.' 
              : 'Selecione a unidade padrão ou escolha uma personalizada.'}
          </span>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Descrição / Detalhes de Execução</label>
          <textarea
            value={form.descricao || ''}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            rows={2}
            placeholder="Detalhes técnicos, observações de execução e acabamento..."
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"
          />
        </div>
      </div>

      {/* 2. Precificação e Custos (Separação Clara) */}
      <div className="glass-card rounded-2xl p-5 border border-slate-700/60 bg-slate-900/50 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">Precificação e Custos</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Cálculo bidirecional: Custo Terceiro vs. Venda Cliente
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Custo Mão de Obra / Terceiro */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5 text-blue-400">
                <Wrench className="w-3.5 h-3.5" />
                Custo Mão de Obra / Terceiro (R$) *
              </span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.mao_de_obra}
              onChange={(e) => handleMaoDeObraChange(e.target.value)}
              placeholder="0,00"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 font-semibold"
            />
            <p className="text-[10px] text-slate-500 mt-1">Valor pago ao prestador por unidade</p>
          </div>

          {/* Preço de Venda ao Cliente */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <DollarSign className="w-3.5 h-3.5" />
                Preço de Venda ao Cliente (R$) *
              </span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.preco_total}
              onChange={(e) => handlePrecoVendaChange(e.target.value)}
              placeholder="0,00"
              className="w-full bg-emerald-950/30 border border-emerald-500/60 rounded-xl px-4 py-2.5 text-sm text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-bold"
            />
            <p className="text-[10px] text-slate-500 mt-1">Valor cobrado na proposta/orçamento</p>
          </div>

          {/* Margem de Lucro % sobre Venda */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5 text-purple-400">
                <Percent className="w-3.5 h-3.5" />
                % Margem s/ Venda
              </span>
            </label>
            <input
              type="number"
              step="0.1"
              value={form.margem_lucro}
              onChange={(e) => handleMargemChange(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-semibold"
            />
            <p className="text-[10px] text-slate-500 mt-1">Sincronizado automaticamente</p>
          </div>
        </div>

        {/* Atalhos rápidos de Markup sobre custo */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
          <span className="text-[11px] text-slate-400 font-medium">Calcular por Markup sobre Custo:</span>
          {[20, 30, 40, 50, 60].map(pct => (
            <button
              key={pct}
              type="button"
              onClick={() => handleApplyMarkup(pct)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer"
            >
              +{pct}%
            </button>
          ))}
        </div>
      </div>

      {/* 3. Resumo de Composição de Custo */}
      <div className="glass-card rounded-2xl p-4 border border-slate-700/50 bg-slate-900/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Resumo de Composição de Custo</span>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Unidade: <span className="text-emerald-400 font-semibold">{form.unidade || "Un"}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <span className="text-slate-400 block text-[11px] mb-1">Mão de Obra (Terceiro)</span>
            <span className="text-blue-400 font-bold text-sm">{formatCurrency(custoTerceiro)}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <span className="text-slate-400 block text-[11px] mb-1">Custo Total Direto</span>
            <span className="text-slate-200 font-bold text-sm">{formatCurrency(custoTotalDireto)}</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-emerald-400 block text-[11px] mb-1">Preço Venda ao Cliente</span>
            <span className="text-emerald-400 font-bold text-sm">{formatCurrency(precoVenda)}</span>
          </div>

          <div className={`p-3 rounded-xl col-span-2 md:col-span-1 border ${lucroBruto >= 0 ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-red-500/15 border-red-500/40 text-red-300'}`}>
            <span className="block text-[11px] mb-1 font-medium">Lucro / Margem</span>
            <span className="font-bold text-sm block">
              {lucroBruto >= 0 ? '+' : ''}{formatCurrency(lucroBruto)}
            </span>
            <span className="text-[10px] opacity-80 block font-medium">
              {margemSobreVenda.toFixed(1)}% margem | {markupSobreCusto.toFixed(1)}% markup
            </span>
          </div>
        </div>
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
          {servico?.id ? 'Salvar Alterações' : 'Criar Serviço'}
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
  onRefreshCatalog = null,
  initialOrcamento = null,
  readOnlyView = false,
  user = null
}) {
  const [itens, setItens] = useState([]);
  const [assistenteMergeState, setAssistenteMergeState] = useState(null);
  const [clienteNome, setClienteNome] = useState('');
  const [pessoaContato, setPessoaContato] = useState('');
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
  const [margemBdiPercentual, setMargemBdiPercentual] = useState(15.0);
  const [impostosPercentual, setImpostosPercentual] = useState(20.5);
  const [modoExibicao, setModoExibicao] = useState('resumido');
  const [fornecimentoMateriais, setFornecimentoMateriais] = useState('edifica');
  const [step, setStep] = useState(1); // 1: edição/seleção, 2: preview/PDF
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentId, setCurrentId] = useState(null);
  const [subtotalBackend, setSubtotalBackend] = useState(0);
  const [valorTotalBackend, setValorTotalBackend] = useState(0);

  // Busca e Filtros
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [itemFilterType, setItemFilterType] = useState('todos'); // 'todos', 'servicos', 'insumos'

  // Novo Material
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [showAssistenteDrywall, setShowAssistenteDrywall] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ nome: '', unidade: 'Ml', preco_medio: '' });
  const [savingMaterial, setSavingMaterial] = useState(false);

  useEffect(() => {
    if (initialOrcamento) {
      setCurrentId(initialOrcamento.id);
      setClienteNome(initialOrcamento.cliente_nome || '');
      setPessoaContato(initialOrcamento.pessoa_contato || '');

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
      setCondicoesPagamentoCustom(initialOrcamento.condicao_pagamento || '');
      setObraId(initialOrcamento.obra_id || '');
      setStatus(initialOrcamento.status || 'rascunho');
      setObservacoes(initialOrcamento.observacoes || '');
      setNotas(initialOrcamento.notas || '');
      setValidadeDias(initialOrcamento.validade_dias || 15);
      setMargemBdiPercentual(initialOrcamento.margem_bdi_percentual ?? 15.0);
      setImpostosPercentual(initialOrcamento.impostos_percentual ?? 20.5);
      setModoExibicao(initialOrcamento.modo_exibicao || 'resumido');
      setFornecimentoMateriais(initialOrcamento.fornecimento_materiais || 'edifica');
      setSubtotalBackend(Number(initialOrcamento.subtotal) || 0);
      setValorTotalBackend(Number(initialOrcamento.valor_total) || 0);
      setItens(
        (initialOrcamento.orcamento_itens || initialOrcamento.itens || []).map(it => ({
          servico_id: it.servico_id,
          material_id: it.material_id,
          tipo: it.tipo || (it.material_id ? 'insumo' : 'servico'),
          servico_nome: it.descricao || it.servico_nome || 'Item',
          preco_unitario: Number(it.preco_unitario) || 0,
          quantidade: Number(it.quantidade) || 1,
          desconto_percentual: Number(it.desconto_percentual) || 0,
        }))
      );
      setStep(readOnlyView ? 2 : 1);
    } else {
      setClienteNome('');
      setPessoaContato('');
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
      setMargemBdiPercentual(15.0);
      setImpostosPercentual(20.5);
      setModoExibicao('resumido');
      setFornecimentoMateriais('edifica');
      setSubtotalBackend(0);
      setValorTotalBackend(0);
      setItens([]);
      setStep(1);
      setCurrentId(null);
      setItemSearchTerm('');
      setItemFilterType('todos');
      setAssistenteMergeState(null);
    }
    setErrorMsg('');
  }, [initialOrcamento, readOnlyView, isOpen]);

  const handleAddServico = (servico) => {
    if (itens.find(i => i.servico_id === servico.id)) return;
    setItens(prev => [...prev, {
      servico_id: servico.id,
      material_id: null,
      tipo: 'servico',
      servico_nome: servico.nome,
      preco_unitario: Number(servico.preco_total) || 0,
      preco_catalogo: Number(servico.preco_total) || 0,
      unidade: servico.unidade || 'Vb',
      quantidade: 1,
      fornecido_por: 'Edifica',
      materiais: servico.servico_materiais || [],
      mao_de_obra: servico.mao_de_obra || 0
    }]);
  };

  
  const handleAddAssistenteMateriais = (insumosList) => {
    // 1. Consolida os materiais que vieram do assistente
    const consolidado = {};
    insumosList.forEach(ins => {
      const id = ins.material_id;
      if (!id) return;
      if (!consolidado[id]) {
        consolidado[id] = { ...ins };
      } else {
        consolidado[id].qtd_compra += ins.qtd_compra;
      }
    });
    const itensConsolidados = Object.values(consolidado).map(ins => ({
      servico_id: null,
      material_id: ins.material_id,
      tipo: 'insumo',
      servico_nome: ins.descricao,
      preco_unitario: Number(ins.preco_unitario) || 0,
      preco_catalogo: Number(ins.preco_unitario) || 0,
      quantidade: ins.qtd_compra,
      unidade: ins.unidade,
      fornecido_por: ins.fornecido_por || 'Edifica'
    }));

    // 2. Verifica se algum já existe no orçamento
    const idsNoOrcamento = new Set(itens.filter(i => i.tipo === 'insumo').map(i => i.material_id));
    const conflitos = itensConsolidados.filter(ins => idsNoOrcamento.has(ins.material_id));

    if (conflitos.length > 0) {
      setAssistenteMergeState({ pending: true, itens: itensConsolidados });
      setShowAssistenteDrywall(false);
    } else {
      aplicarAssistenteMateriais(itensConsolidados, 'add');
    }
  };

  const aplicarAssistenteMateriais = (lista, mode) => {
    setItens(prev => {
      let novoItens = [...prev];
      lista.forEach(ins => {
        const itemExistente = novoItens.find(i => i.tipo === 'insumo' && i.material_id === ins.material_id);
        if (itemExistente) {
          if (mode === 'somar') {
            itemExistente.quantidade += ins.quantidade;
          } else if (mode === 'substituir') {
            itemExistente.quantidade = ins.quantidade;
          }
        } else {
          novoItens.push(ins);
        }
      });
      return novoItens;
    });
    setAssistenteMergeState(null);
    setShowAssistenteDrywall(false);
  };

  const handleAddMaterial = (material) => {
    if (itens.find(i => i.material_id === material.id)) return;
    setItens(prev => [...prev, {
      servico_id: null,
      material_id: material.id,
      tipo: 'insumo',
      servico_nome: material.nome,
      preco_unitario: Number(material.preco_medio) || 0,
      preco_catalogo: Number(material.preco_medio) || 0,
      unidade: material.unidade || 'Un',
      quantidade: 1,
      fornecido_por: 'Edifica'
    }]);
  };

  const handleCreateMaterial = async () => {
    setSavingMaterial(true);
    try {
      const res = await api.post('/materiais', {
        nome: newMaterial.nome.trim(),
        unidade: newMaterial.unidade.trim() || 'Un',
        preco_medio: parseFloat(String(newMaterial.preco_medio).replace(',', '.')) || 0,
      });
      const created = res.data;
      if (onMaterialCreated) onMaterialCreated(created);
      handleAddMaterial(created);
      setNewMaterial({ nome: '', unidade: 'Ml', preco_medio: '' });
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

  const handleLoadModel = (modelo) => {
    if (!modelo) return;
    const modelServicos = servicos.filter(s => s.categoria === modelo);
    if (modelServicos.length === 0) {
      alert(`Nenhum serviço encontrado para o modelo ${modelo}.`);
      return;
    }
    const currentIds = new Set(itens.map(i => i.servico_id));
    const newItens = modelServicos
      .filter(s => !currentIds.has(s.id))
      .map(s => ({
        servico_id: s.id,
        material_id: null,
        tipo: 'servico',
        servico_nome: s.nome,
        preco_unitario: Number(s.preco_total) || 0,
        preco_catalogo: Number(s.preco_total) || 0,
        unidade: s.unidade || 'Vb',
        quantidade: 1,
        fornecido_por: 'Edifica',
        desconto_percentual: 0,
        materiais: s.servico_materiais || [],
        mao_de_obra: s.mao_de_obra || 0
      }));
    if (newItens.length > 0) {
      setItens(prev => [...prev, ...newItens]);
    }
  };

  const subtotalBruto = subtotalBackend;
  const totalLiquido = subtotalBackend;
  const valorTotalFinal = valorTotalBackend;

  const buildOrcamentoPayload = (statusOverride = null) => {
    const targetStatus = statusOverride || status;
    const contactParts = [];
    if (pessoaContato.trim()) contactParts.push(`Contato: ${pessoaContato.trim()}`);
    if (clienteTelefone.trim()) contactParts.push(clienteTelefone.trim());
    if (clienteEmail.trim()) contactParts.push(clienteEmail.trim());
    const combinedContato = contactParts.join(' • ');

    const payload = {
      obra_id: obraId || null,
      cliente_nome: clienteNome.trim() || 'Rascunho de Orçamento',
      pessoa_contato: pessoaContato.trim() || null,
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
      condicao_pagamento: condicoesPagamentoCustom.trim() || null,
      modo_exibicao: modoExibicao,
    };

    // Não envia itens e totais se o orçamento já está aprovado e continua aprovado,
    // para evitar que o backend bloqueie o salvamento dos demais campos.
    const initialStatus = initialOrcamento?.status || 'rascunho';
    const isApprovedAndStayingApproved = initialStatus === 'aprovado' && targetStatus === 'aprovado';

    if (!isApprovedAndStayingApproved) {
      payload.margem_bdi_percentual = margemBdiPercentual;
      payload.impostos_percentual = impostosPercentual;
      payload.fornecimento_materiais = fornecimentoMateriais;
      payload.itens = itens.map(i => ({
        servico_id: i.servico_id || null,
        material_id: i.material_id || null,
        tipo: i.tipo,
        descricao: i.servico_nome || i.descricao,
        quantidade: Number(i.quantidade) || 0,
        preco_unitario: Number(i.preco_unitario) || 0,
        fornecido_por: i.fornecido_por || 'Edifica',
        unidade: i.unidade,
        preco_catalogo: i.preco_catalogo,
        embalagem_id: i.embalagem_id || null,
        origem_assistente: i.origem_assistente || false,
        assistente_execucao_id: i.assistente_execucao_id || null,
      }));
    }

    return payload;
  };

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
      const payload = buildOrcamentoPayload(statusOverride);

      let res;
      if (currentId) {
        res = await api.put(`/servicos/orcamentos/${currentId}`, payload);
      } else {
        res = await api.post('/servicos/orcamentos', payload);
        setCurrentId(res.data.id);
      }
      
      if (res && res.data) {
        if (res.data.subtotal !== undefined && res.data.subtotal !== null) setSubtotalBackend(Number(res.data.subtotal));
        if (res.data.valor_total !== undefined && res.data.valor_total !== null) setValorTotalBackend(Number(res.data.valor_total));
      }

      try {
        if (onSaveSuccess) {
          onSaveSuccess(res.data, targetStatus === 'aprovado');
        }
      } catch (cbErr) {
        console.warn('Erro no callback onSaveSuccess:', cbErr);
      }
      onClose();
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMsg('Erro: ' + (typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail)));
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setErrorMsg('Tempo limite excedido ao salvar o orçamento. Tente novamente.');
      } else {
        setErrorMsg('Erro ao salvar orçamento. Tente novamente.');
      }
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
      const payload = buildOrcamentoPayload();

      let res;
      if (currentId) {
        res = await api.put(`/servicos/orcamentos/${currentId}`, payload);
      } else {
        res = await api.post('/servicos/orcamentos', payload);
      }
      
      if (res && res.data) {
        if (res.data.subtotal !== undefined && res.data.subtotal !== null) setSubtotalBackend(Number(res.data.subtotal));
        if (res.data.valor_total !== undefined && res.data.valor_total !== null) setValorTotalBackend(Number(res.data.valor_total));
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
        const payload = buildOrcamentoPayload();

        let res;
        if (currentId) {
          res = await api.put(`/servicos/orcamentos/${currentId}`, payload);
        } else {
          res = await api.post('/servicos/orcamentos', payload);
          setCurrentId(res.data.id);
        }
        
        if (res && res.data) {
          if (res.data.subtotal !== undefined && res.data.subtotal !== null) setSubtotalBackend(Number(res.data.subtotal));
          if (res.data.valor_total !== undefined && res.data.valor_total !== null) setValorTotalBackend(Number(res.data.valor_total));
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
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Cliente / Razão Social *</label>
                <input
                  type="text"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Nome completo ou empresa"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Pessoa de Contato (Responsável)</label>
                <input
                  type="text"
                  value={pessoaContato}
                  onChange={(e) => setPessoaContato(e.target.value)}
                  placeholder="Ex: Eng. Marcos, Síndico Roberto"
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

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Margem / BDI (%)</label>
                <input
                  type="number" step="0.1" min="0"
                  value={margemBdiPercentual}
                  onChange={(e) => setMargemBdiPercentual(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Impostos (%)</label>
                <input
                  type="number" step="0.1" min="0"
                  value={impostosPercentual}
                  onChange={(e) => setImpostosPercentual(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  Fornecimento de Materiais (Global)
                </label>
                <select
                  value={fornecimentoMateriais}
                  onChange={(e) => setFornecimentoMateriais(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  <option value="edifica">A Edifica fornece (valores somados ao orçamento)</option>
                  <option value="cliente">O Cliente fornece (valores zerados no orçamento)</option>
                </select>
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

          {/* Seleção de Modelo Rápido */}
          <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center justify-between">
            <div>
              <h5 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Carregar Modelo de Orçamento
              </h5>
              <p className="text-[10px] text-slate-400">Preencha os itens automaticamente com quantidade padrão (1).</p>
            </div>
            <select
              onChange={(e) => {
                if(e.target.value) {
                  handleLoadModel(e.target.value);
                  e.target.value = "";
                }
              }}
              className="bg-slate-900 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="">+ Escolher Modelo</option>
              <option value="Alvenaria">Alvenaria</option>
              <option value="Drywall">Drywall</option>
            </select>
          </div>

          {/* Seleção de Itens (Serviços e Materiais) */}
          <div>
            <h4 className="text-sm font-bold text-white mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Catálogo de Serviços e Materiais
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
                  Materiais
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
                  filteredItems.push(...m.map(i => ({ ...i, tipo: 'Material' })));
                }

                if (servicos.length === 0 && materiais.length === 0) {
                  return (
                    <div className="p-4 text-center">
                      <p className="text-xs text-amber-400 mb-2">Nenhum serviço ou insumo carregado no momento.</p>
                      {onRefreshCatalog && (
                        <button
                          type="button"
                          onClick={onRefreshCatalog}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          Recarregar catálogo
                        </button>
                      )}
                    </div>
                  );
                }

                if (filteredItems.length === 0) {
                  return (
                    <p className="text-xs text-slate-500 p-3 text-center">
                      {term ? `Nenhum item encontrado para "${itemSearchTerm}".` : 'Nenhum item cadastrado nesta categoria.'}
                    </p>
                  );
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
            
            <div className="mt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAssistenteDrywall(true)}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                🪄 Assistentes de Cálculo
              </button>
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
                <h5 className="text-xs font-bold text-white mb-2">Novo Material Direto</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Nome do Material</label>
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
                      className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-white cursor-pointer"
                    >
                      {UNIDADES_INSUMO_PADRAO.map(u => (
                        <option key={u.value} value={u.value} className="bg-slate-900 text-white">
                          {u.label}
                        </option>
                      ))}
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
                <span className="text-xs text-slate-400 font-normal">Ajuste quantitativo e valor unitário</span>
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {itens.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate block">{item.servico_nome}</span>
                        {fornecimentoMateriais === 'cliente' && item.tipo === 'insumo' && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold uppercase">Fornecido p/ Cliente</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Unidade: <span className="text-slate-300 font-normal">{item.unidade || (item.tipo === 'insumo' ? 'Un' : 'Vb')}</span></span>
                        {item.preco_unitario !== item.preco_catalogo && item.preco_catalogo !== undefined && (
                          <div className="flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">
                            <span className="text-[9px] text-amber-400 uppercase font-bold">Valor Alterado</span>
                            <span className="text-[9px] text-slate-400 line-through pl-1">{formatCurrency(item.preco_catalogo)}</span>
                            <button onClick={() => handleUpdateItem(idx, 'preco_unitario', item.preco_catalogo)} className="text-amber-400 hover:text-amber-300 ml-1 bg-amber-500/20 rounded p-0.5" title="Restaurar valor do catálogo"><RotateCcw className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div>
                        <label className="text-[10px] text-slate-500 block uppercase font-semibold">Quantidade</label>
                        <input
                          type="number" step="0.01" min="0"
                          value={item.quantidade}
                          onChange={(e) => handleUpdateItem(idx, 'quantidade', e.target.value)}
                          className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block uppercase font-semibold">Valor Unitário</label>
                        <input
                          type="number" step="0.01" min="0"
                          value={item.preco_unitario}
                          onChange={(e) => handleUpdateItem(idx, 'preco_unitario', e.target.value)}
                          className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                        />
                      </div>
                      <div className="text-right min-w-[90px]">
                        <label className="text-[10px] text-slate-500 block uppercase font-semibold">Subtotal</label>
                        <span className="text-xs font-bold text-emerald-400">
                          {formatCurrency((fornecimentoMateriais === 'cliente' && item.tipo === 'insumo') ? 0 : (item.preco_unitario * item.quantidade))}
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
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Subtotal</span>
                    <span className="text-sm font-semibold text-slate-300">{formatCurrency(subtotalBruto)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 block font-bold">Valor Total da Proposta</span>
                  <span className="text-2xl font-black text-emerald-400">{formatCurrency(valorTotalFinal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Ações do Modal */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-800">
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

              {fornecimentoMateriais === 'cliente' && itens.some(i => i.tipo === 'insumo') && (
                <button
                  type="button"
                  disabled={itens.length === 0 || !clienteNome.trim()}
                  onClick={() => printListaMateriais({
                    clienteNome,
                    clienteEndereco,
                    clienteTelefone,
                    clienteEmail,
                    clienteContato: [clienteTelefone, clienteEmail].filter(Boolean).join(' • '),
                    itens,
                    dataEmissao: initialOrcamento?.created_at
                      ? new Date(initialOrcamento.created_at).toLocaleDateString('pt-BR')
                      : new Date().toLocaleDateString('pt-BR'),
                  })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-amber-200 border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>PDF Lista de Materiais</span>
                </button>
              )}
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

      {showAssistenteDrywall && (
        <AssistenteDrywallModal 
          onClose={() => setShowAssistenteDrywall(false)}
          onAddInsumos={handleAddAssistenteMateriais}
          materiaisCatalog={materiais}
        />
      )}

      {/* Modal de Conflito de Materiais do Assistente */}
      {assistenteMergeState?.pending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-2">Materiais Duplicados</h3>
            <p className="text-sm text-slate-400 mb-6">
              Alguns materiais calculados pelo assistente já existem neste orçamento. O que você deseja fazer com as quantidades?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => aplicarAssistenteMateriais(assistenteMergeState.itens, 'somar')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Somar as Quantidades
              </button>
              <button 
                onClick={() => aplicarAssistenteMateriais(assistenteMergeState.itens, 'substituir')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Substituir pelas Novas
              </button>
              <button 
                onClick={() => setAssistenteMergeState(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors cursor-pointer mt-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <PropostaComercialPreviewModal
          data={{
            user,
            clienteNome,
            clienteEndereco,
            clienteTelefone,
            clienteEmail,
            clienteContato: [clienteTelefone, clienteEmail].filter(Boolean).join(' • '),
            dataEmissao: initialOrcamento?.created_at
              ? new Date(initialOrcamento.created_at).toLocaleDateString('pt-BR')
              : new Date().toLocaleDateString('pt-BR'),
            itens,
            valorTotal: valorTotalFinal,
            margemBdiPercentual,
            impostosPercentual,
            validadeDias,
            prazoDias,
            prazoGarantia,
            objetivoCustom,
            observacoesCustom: observacoes,
            condicoesPagamentoCustom,
            fornecimentoMateriais,
          }}
          onClose={onClose}
          onBackToEdit={() => setStep(1)}
          readOnlyView={readOnlyView}
          onSave={!readOnlyView ? () => handleSaveOrcamento() : null}
          saving={saving}
          modoVisualizacao={modoExibicao}
          onModoVisualizacaoChange={(modo) => setModoExibicao(modo)}
        />
      )}
    </Modal>
  );
}


// ========================================
// ========================================
// Componente Principal
// ========================================
export default function ServicosPage({ initialOrcamentoData = null, onClearInitialOrcamentoData = null, user = null }) {
  const [activeSubTab, setActiveSubTab] = useState('orcamentos'); // 'orcamentos' ou 'servicos'
  const [servicos, setServicos] = useState(() => {
    try {
      const cached = localStorage.getItem('edifica_cached_servicos');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return FALLBACK_SERVICOS;
  });

  const [materiais, setMateriais] = useState(() => {
    try {
      const cached = localStorage.getItem('edifica_cached_materiais');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return FALLBACK_MATERIAIS;
  });

  const [categorias, setCategorias] = useState(CATEGORIAS_PADRAO);
  const [orcamentos, setOrcamentos] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (initialOrcamentoData) {
      setActiveSubTab('orcamentos');
      setSelectedOrcamento(initialOrcamentoData);
      setReadOnlyViewOrcamento(false);
      setShowOrcamento(true);
      if (onClearInitialOrcamentoData) {
        onClearInitialOrcamentoData();
      }
    }
  }, [initialOrcamentoData]);

  // Filtros de Serviços
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');

  // Filtros de Orçamentos
  const [orcamentoSearch, setOrcamentoSearch] = useState('');
  const [orcamentoStatusFilter, setOrcamentoStatusFilter] = useState('');
  const [orcamentoObraFilter, setOrcamentoObraFilter] = useState('');

  // Filtros e Edição da Tabela de Valores (Gestão Global de Materiais / Materiais)
  const [tabelaSearch, setTabelaSearch] = useState('');
  const [tabelaUnidadeFilter, setTabelaUnidadeFilter] = useState('');
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineValores, setInlineValores] = useState({ preco_medio: '' });
  const [savingValoresId, setSavingValoresId] = useState(null);

  // Modais de Materiais (Tabela de Valores)
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [insumoForm, setMaterialForm] = useState({ nome: '', unidade: 'M²', preco_medio: '' });
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [showDeleteMaterialConfirm, setShowDeleteMaterialConfirm] = useState(null);

  // Modais de Serviços e Orçamentos
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

  // Stats da Tabela de Valores (Exclusiva para Materiais / Materiais)
  const tabelaValoresStats = useMemo(() => {
    const total = materiais.length;
    const somaPrecoMedio = materiais.reduce((acc, m) => acc + (Number(m.preco_medio) || 0), 0);
    const precoMedioMaterial = total > 0 ? somaPrecoMedio / total : 0;
    const maiorPreco = materiais.reduce((max, m) => Math.max(max, Number(m.preco_medio) || 0), 0);

    const insumosEmUsoSet = new Set();
    servicos.forEach(s => {
      (s.servico_materiais || []).forEach(sm => {
        if (sm.material_id) insumosEmUsoSet.add(sm.material_id);
      });
    });
    const insumosEmUso = insumosEmUsoSet.size;

    return {
      total,
      precoMedioMaterial,
      maiorPreco,
      insumosEmUso
    };
  }, [materiais, servicos]);

  // Contagem de serviços vinculados a um insumo
  const getMaterialUsageCount = useCallback((materialId) => {
    return servicos.filter(s =>
      (s.servico_materiais || []).some(sm => sm.material_id === materialId)
    ).length;
  }, [servicos]);

  // Recálculo em cascata: ao alterar o custo de um insumo globalmente,
  // todos os serviços que o utilizam na composição têm o custo de material recalculado automaticamente
  const cascadeRecalculateServicos = useCallback((materialId, novoPreco) => {
    setServicos(prevServicos => {
      const updated = prevServicos.map(s => {
        const hasMaterial = (s.servico_materiais || []).some(sm => sm.material_id === materialId);
        if (!hasMaterial) return s;

        const updatedMateriais = (s.servico_materiais || []).map(sm => {
          if (sm.material_id === materialId) {
            const precoUnit = Number(novoPreco) || 0;
            const qtd = Number(sm.quantidade) || 1;
            const rend = Number(sm.rendimento) || 1;
            const subtotal = rend > 0 ? (qtd / rend) * precoUnit : qtd * precoUnit;
            return {
              ...sm,
              preco_unitario: precoUnit,
              subtotal
            };
          }
          return sm;
        });

        const novoCustoMateriais = updatedMateriais.reduce((sum, m) => sum + (m.subtotal || 0), 0);
        const custoTerceiro = Number(s.mao_de_obra) || 0;
        const precoVenda = Number(s.preco_total) || 0;
        const novoLucro = precoVenda - (novoCustoMateriais + custoTerceiro);
        const novaMargem = precoVenda > 0 ? (novoLucro / precoVenda) * 100 : Number(s.margem_lucro) || 0;

        return {
          ...s,
          servico_materiais: updatedMateriais,
          margem_lucro: Math.round(novaMargem * 10) / 10
        };
      });
      try { localStorage.setItem('edifica_cached_servicos', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // Unidades distintas para o filtro da tabela de insumos
  const allUnidades = useMemo(() => {
    const list = [...new Set(materiais.map(m => m.unidade || "Un").filter(Boolean))];
    return list.sort();
  }, [materiais]);

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
        api.get('/materiais'),
        api.get('/servicos/categorias'),
        api.get('/servicos/orcamentos'),
        api.get('/obras'),
      ]);

      if (servicosRes.status === 'fulfilled' && Array.isArray(servicosRes.value.data)) {
        setServicos(servicosRes.value.data);
        try { localStorage.setItem('edifica_cached_servicos', JSON.stringify(servicosRes.value.data)); } catch {}
      }
      if (materiaisRes.status === 'fulfilled' && Array.isArray(materiaisRes.value.data)) {
        setMateriais(materiaisRes.value.data);
        try { localStorage.setItem('edifica_cached_materiais', JSON.stringify(materiaisRes.value.data)); } catch {}
      }
      if (categoriasRes.status === 'fulfilled' && Array.isArray(categoriasRes.value.data)) {
        setCategorias(categoriasRes.value.data);
      }
      if (orcamentosRes.status === 'fulfilled' && Array.isArray(orcamentosRes.value.data)) {
        setOrcamentos(orcamentosRes.value.data);
      }
      if (obrasRes.status === 'fulfilled' && Array.isArray(obrasRes.value.data)) {
        setObras(obrasRes.value.data);
      }
    } catch (err) {
      console.log('Operando com dados locais/cache:', err);
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

  // Filtrar Materiais da Tabela de Valores
  const filteredTabelaMateriais = useMemo(() => {
    return materiais.filter(m => {
      const matchSearch = !tabelaSearch ||
        m.nome?.toLowerCase().includes(tabelaSearch.toLowerCase());
      const unidFormatted = m.unidade || "Un";
      const matchUnidade = !tabelaUnidadeFilter || unidFormatted === tabelaUnidadeFilter;
      return matchSearch && matchUnidade;
    });
  }, [materiais, tabelaSearch, tabelaUnidadeFilter]);

  // Handlers da Tabela de Valores (Edição Rápida Inline de Custo Unitário)
  const handleStartInlineEdit = (material) => {
    setInlineEditingId(material.id);
    setInlineValores({
      preco_medio: material.preco_medio || 0
    });
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineValores({ preco_medio: '' });
  };

  const handleSaveValoresInline = async (materialId) => {
    setSavingValoresId(materialId);
    try {
      const precoMedio = parseFloat(String(inlineValores.preco_medio).replace(',', '.')) || 0;
      
      if (materialId && !materialId.startsWith('m0') && !materialId.startsWith('m-')) {
        const res = await api.put(`/materiais/${materialId}`, {
          preco_medio: precoMedio
        });
        if (res.data) {
          setMateriais(prev => {
            const updated = prev.map(m => m.id === materialId ? { ...m, ...res.data } : m);
            try { localStorage.setItem('edifica_cached_materiais', JSON.stringify(updated)); } catch {}
            return updated;
          });
        }
      } else {
        // Local / mock
        setMateriais(prev => {
          const updated = prev.map(m => {
            if (m.id === materialId) {
              return { ...m, preco_medio: precoMedio };
            }
            return m;
          });
          try { localStorage.setItem('edifica_cached_materiais', JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
      cascadeRecalculateServicos(materialId, precoMedio);
      setToast({ message: 'Custo do insumo atualizado e composições recalculadas!', type: 'success' });
      setInlineEditingId(null);
    } catch (err) {
      setToast({ message: 'Erro ao atualizar valor na tabela.', type: 'error' });
    } finally {
      setSavingValoresId(null);
    }
  };

  // Handlers do Modal de Materiais (Criar/Editar/Excluir)
  const handleOpenNewMaterial = () => {
    setEditingMaterial(null);
    setMaterialForm({ nome: '', unidade: 'M²', preco_medio: '' });
    setShowMaterialModal(true);
  };

  const handleOpenEditMaterial = (material) => {
    setEditingMaterial(material);
    setMaterialForm({
      nome: material.nome || '',
      unidade: material.unidade || 'm²',
      preco_medio: material.preco_medio !== undefined ? String(material.preco_medio) : ''
    });
    setShowMaterialModal(true);
  };

  const handleSaveMaterialForm = async (e) => {
    if (e) e.preventDefault();
    if (!insumoForm.nome.trim()) return;
    setSavingMaterial(true);
    try {
      const precoMedio = parseFloat(String(insumoForm.preco_medio).replace(',', '.')) || 0;
      const payload = {
        nome: insumoForm.nome.trim(),
        unidade: insumoForm.unidade.trim() || 'Un',
        preco_medio: precoMedio
      };

      if (editingMaterial?.id && !editingMaterial.id.startsWith('m0') && !editingMaterial.id.startsWith('m-')) {
        const res = await api.put(`/materiais/${editingMaterial.id}`, payload);
        const updatedMat = res.data || { ...editingMaterial, ...payload };
        setMateriais(prev => {
          const updated = prev.map(m => m.id === editingMaterial.id ? updatedMat : m);
          try { localStorage.setItem('edifica_cached_materiais', JSON.stringify(updated)); } catch {}
          return updated;
        });
        cascadeRecalculateServicos(editingMaterial.id, precoMedio);
        setToast({ message: 'Material atualizado e composições recalculadas!', type: 'success' });
      } else if (editingMaterial) {
        // Mock edit
        const updatedMat = { ...editingMaterial, ...payload };
        setMateriais(prev => {
          const updated = prev.map(m => m.id === editingMaterial.id ? updatedMat : m);
          try { localStorage.setItem('edifica_cached_materiais', JSON.stringify(updated)); } catch {}
          return updated;
        });
        cascadeRecalculateServicos(editingMaterial.id, precoMedio);
        setToast({ message: 'Material atualizado com sucesso!', type: 'success' });
      } else {
        // Criar novo insumo
        try {
          const res = await api.post('/materiais', payload);
          const newMat = res.data || { id: `m-${Date.now()}`, ...payload };
          setMateriais(prev => {
            const updated = [newMat, ...prev];
            try { localStorage.setItem('edifica_cached_materiais', JSON.stringify(updated)); } catch {}
            return updated;
          });
        } catch {
          const newMat = { id: `m-${Date.now()}`, ...payload };
          setMateriais(prev => {
            const updated = [newMat, ...prev];
            try { localStorage.setItem('edifica_cached_materiais', JSON.stringify(updated)); } catch {}
            return updated;
          });
        }
        setToast({ message: 'Novo insumo cadastrado na Tabela de Valores!', type: 'success' });
      }
      setShowMaterialModal(false);
      setEditingMaterial(null);
    } catch (err) {
      setToast({ message: 'Erro ao salvar insumo.', type: 'error' });
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (material) => {
    try {
      if (material.id && !material.id.startsWith('m0') && !material.id.startsWith('m-')) {
        await api.delete(`/materiais/${material.id}`);
      }
      setMateriais(prev => {
        const updated = prev.filter(m => m.id !== material.id);
        try { localStorage.setItem('edifica_cached_materiais', JSON.stringify(updated)); } catch {}
        return updated;
      });
      setShowDeleteMaterialConfirm(null);
      setToast({ message: 'Material removido da Tabela de Valores.', type: 'info' });
    } catch (err) {
      setToast({ message: 'Erro ao excluir insumo.', type: 'error' });
    }
  };

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
          ) : activeSubTab === 'servicos' ? (
            <button
              onClick={handleNewServico}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Serviço</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Sub-Tabs de Navegação — scroll horizontal no mobile */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex items-center gap-1 border-b border-slate-800 pb-2 min-w-max">
          <button
            onClick={() => setActiveSubTab('orcamentos')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'orcamentos'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Orçamentos & Propostas</span>
            <span className="sm:hidden">Orçamentos</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
              {orcamentos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('servicos')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'servicos'
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Catálogo de Serviços</span>
            <span className="sm:hidden">Serviços</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
              {servicos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('tabela_valores')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'tabela_valores'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Package className={`w-4 h-4 shrink-0 ${activeSubTab === 'tabela_valores' ? 'text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Tabela de Valores (Materiais)</span>
            <span className="sm:hidden">Materiais</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
              {materiais.length}
            </span>
          </button>
        </div>
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
                            user,
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
                            fornecimentoMateriais: orc.fornecimento_materiais || 'edifica',
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

      {/* ============================================================== */}
      {/* ABA 3: TABELA DE VALORES (GESTÃO GLOBAL DE INSUMOS / MATERIAIS) */}
      {/* ============================================================== */}
      {activeSubTab === 'tabela_valores' && (
        <div className="space-y-6">
          {/* Banner Explicativo / Regra de Negócio Notion */}
          <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Tabela de Valores — Gestão Global de Materiais</h4>
                <p className="text-xs text-slate-400">
                  Custos unitários base dos materiais utilizados nas composições. Alterações refletem automaticamente no custo de materiais de todos os serviços vinculados (orçamentos já aprovados permanecem congelados).
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenNewMaterial}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Material</span>
            </button>
          </div>

          {/* KPIs da Tabela de Valores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Materiais Cadastrados',
                value: `${tabelaValoresStats.total} insumos`,
                icon: Package,
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/20'
              },
              {
                label: 'Custo Médio Unitário',
                value: formatCurrency(tabelaValoresStats.precoMedioMaterial),
                icon: DollarSign,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/20'
              },
              {
                label: 'Materiais em Uso',
                value: `${tabelaValoresStats.insumosEmUso} insumos`,
                sub: 'Vinculados a serviços ativos',
                icon: Wrench,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/20'
              },
              {
                label: 'Maior Custo Unitário',
                value: formatCurrency(tabelaValoresStats.maiorPreco),
                icon: Tag,
                color: 'text-purple-400',
                bg: 'bg-purple-500/10',
                border: 'border-purple-500/20'
              }
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

          {/* Barra de Filtros da Tabela */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={tabelaSearch}
                onChange={(e) => setTabelaSearch(e.target.value)}
                placeholder="Buscar insumo por nome..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={tabelaUnidadeFilter}
                onChange={(e) => setTabelaUnidadeFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer appearance-none min-w-[180px]"
              >
                <option value="">Todas as Unidades</option>
                {allUnidades.map(unid => (
                  <option key={unid} value={unid}>{unid}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabela de Materiais / Materiais */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                <p className="text-sm text-slate-400">Carregando tabela de insumos...</p>
              </div>
            </div>
          ) : filteredTabelaMateriais.length > 0 ? (
            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                      <th className="py-3 px-4">Material / Material</th>
                      <th className="py-3 px-3 text-center">Unidade</th>
                      <th className="py-3 px-4 text-right">Custo Unitário Global (R$)</th>
                      <th className="py-3 px-4 text-center">Serviços Vinculados</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTabelaMateriais.map((material) => {
                      const isEditing = inlineEditingId === material.id;
                      const isSaving = savingValoresId === material.id;
                      const unidSigla = material.unidade || "Un";
                      const usageCount = getMaterialUsageCount(material.id);

                      return (
                        <tr key={material.id} className={`hover:bg-slate-800/30 transition-colors ${isEditing ? 'bg-amber-500/5' : ''}`}>
                          {/* Material / Descrição */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <span className="font-bold text-white text-sm block">{material.nome}</span>
                          </td>

                          {/* Unidade */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 border border-slate-700">
                              {unidSigla}
                            </span>
                          </td>

                          {/* Preço Médio Global */}
                          <td className="py-3.5 px-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-xs text-slate-500 font-medium">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={inlineValores.preco_medio}
                                  onChange={(e) => setInlineValores({ ...inlineValores, preco_medio: e.target.value })}
                                  className="w-28 bg-emerald-950/40 border border-emerald-500 rounded-lg px-2 py-1 text-xs text-emerald-300 text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                                  placeholder="0.00"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveValoresInline(material.id);
                                    if (e.key === 'Escape') handleCancelInlineEdit();
                                  }}
                                />
                              </div>
                            ) : (
                              <span
                                onClick={() => handleStartInlineEdit(material)}
                                className="text-sm font-bold text-emerald-400 cursor-pointer hover:underline transition-colors inline-flex items-center gap-1"
                                title="Clique para editar rapidamente"
                              >
                                {formatCurrency(material.preco_medio)}
                                <Edit3 className="w-3 h-3 opacity-40 hover:opacity-100" />
                              </span>
                            )}
                          </td>

                          {/* Serviços Vinculados */}
                          <td className="py-3.5 px-4 text-center">
                            {usageCount > 0 ? (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {usageCount} {usageCount === 1 ? 'serviço' : 'serviços'}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">Nenhum</span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleSaveValoresInline(material.id)}
                                  disabled={isSaving}
                                  className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-all cursor-pointer"
                                  title="Salvar Custo Unitário"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={handleCancelInlineEdit}
                                  disabled={isSaving}
                                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleStartInlineEdit(material)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
                                  title="Edição Rápida de Custo"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditMaterial(material)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer"
                                  title="Editar Material"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setShowDeleteMaterialConfirm(material)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                                  title="Excluir Material"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-2xl border border-slate-800">
              <Package className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-lg font-semibold text-slate-400 mb-1">
                {tabelaSearch || tabelaUnidadeFilter ? 'Nenhum insumo encontrado' : 'Tabela de valores vazia'}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {tabelaSearch || tabelaUnidadeFilter
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Nenhum insumo cadastrado na tabela de valores.'}
              </p>
              {!tabelaSearch && !tabelaUnidadeFilter && (
                <button
                  onClick={handleOpenNewMaterial}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Primeiro Material</span>
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
        onMaterialCreated={(newMat) => {
          setMateriais(prev => {
            const updated = [...prev, newMat];
            try { localStorage.setItem('edifica_cached_materiais', JSON.stringify(updated)); } catch {}
            return updated;
          });
        }}
        onRefreshCatalog={fetchData}
        initialOrcamento={selectedOrcamento}
        readOnlyView={readOnlyViewOrcamento}
        user={user}
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

      {/* Modal Criar/Editar Material (Tabela de Valores) */}
      <Modal
        isOpen={showMaterialModal}
        onClose={() => { setShowMaterialModal(false); setEditingMaterial(null); }}
        title={editingMaterial ? 'Editar Material na Tabela de Valores' : 'Novo Material no Catálogo Global'}
        size="md"
      >
        <form onSubmit={handleSaveMaterialForm} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Nome do Material / Material <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={insumoForm.nome}
              onChange={(e) => setMaterialForm({ ...insumoForm, nome: e.target.value })}
              placeholder="Ex: Placa Drywall ST 12.5mm, Cimento CP-II..."
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Unidade de Medida <span className="text-red-400">*</span>
              </label>
              <select
                value={insumoForm.unidade}
                onChange={(e) => setMaterialForm({ ...insumoForm, unidade: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
              >
                {UNIDADES_INSUMO_PADRAO.map(u => (
                  <option key={u.value} value={u.value} className="bg-slate-900 text-white">
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Custo Unitário Global (R$) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={insumoForm.preco_medio}
                onChange={(e) => setMaterialForm({ ...insumoForm, preco_medio: e.target.value })}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white text-right focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300/90 leading-relaxed">
            <span className="font-bold">Regra de Negócio Notion:</span> O custo unitário cadastrado aqui é a referência global do insumo. Ao atualizar, as composições de serviços que utilizam este insumo terão o custo de material recalculado automaticamente.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => { setShowMaterialModal(false); setEditingMaterial(null); }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingMaterial || !insumoForm.nome.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{savingMaterial ? 'Salvando...' : editingMaterial ? 'Salvar Alterações' : 'Cadastrar Material'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmação Exclusão de Material */}
      {showDeleteMaterialConfirm && (
        <Modal
          isOpen={!!showDeleteMaterialConfirm}
          onClose={() => setShowDeleteMaterialConfirm(null)}
          title="Excluir Material da Tabela de Valores"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <p className="text-xs">
                Tem certeza que deseja excluir o insumo <strong className="text-white">{showDeleteMaterialConfirm.nome}</strong> da Tabela de Valores?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteMaterialConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteMaterial(showDeleteMaterialConfirm)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
              >
                Excluir Material
              </button>
            </div>
          </div>
        </Modal>
      )}

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


import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Plus, CheckCircle2, Clock, Truck, Layers, X, 
  DollarSign, Building, AlertCircle, Trash2, Filter, ChevronRight, Phone, Mail
} from 'lucide-react';
import api from '../services/api';
import { formatTelefone, formatCNPJ } from '../utils/masks';

export default function ComprasPage({ selectedObraId, obras = [], user }) {
  const [activeTab, setActiveTab] = useState('pedidos'); // 'painel' | 'pedidos' | 'fornecedores'
  const [pedidos, setPedidos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFornecedorModalOpen, setIsFornecedorModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const initialFormData = {
    obra_id: '',
    fornecedor_id: '',
    data_pedido: new Date().toISOString().split('T')[0],
    data_entrega_prevista: '',
    valor_total: '',
    descricao_item: ''
  };
  const [formData, setFormData] = useState(initialFormData);

  const initialFornData = {
    nome: '',
    cnpj: '',
    telefone: '',
    email: ''
  };
  const [fornData, setFornData] = useState(initialFornData);

  const fetchDados = async () => {
    setIsLoading(true);
    try {
      const [resPedidos, resForn] = await Promise.all([
        api.get(`/compras/pedidos${selectedObraId ? `?obra_id=${selectedObraId}` : ''}`),
        api.get('/compras/fornecedores')
      ]);
      setPedidos(resPedidos.data || []);
      setFornecedores(resForn.data || []);
    } catch (error) {
      console.error("Erro ao buscar dados de compras:", error);
      showToast("Erro ao carregar dados.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, [selectedObraId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFornInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'telefone') {
      finalValue = formatTelefone(value);
    } else if (name === 'cnpj') {
      finalValue = formatCNPJ(value);
    }
    setFornData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleCreateFornecedor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/compras/fornecedores', fornData);
      showToast('Fornecedor criado com sucesso!');
      setIsFornecedorModalOpen(false);
      setFornData(initialFornData);
      fetchDados();
    } catch (error) {
      console.error(error);
      showToast('Erro ao criar fornecedor.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        obra_id: formData.obra_id,
        fornecedor_id: formData.fornecedor_id,
        data_pedido: formData.data_pedido,
        data_entrega_prevista: formData.data_entrega_prevista || null,
        valor_total: parseFloat(formData.valor_total.replace(',', '.')) || 0,
        status: 'cotacao',
        itens: [
          {
            descricao: formData.descricao_item,
            quantidade: 1,
            preco_unitario: parseFloat(formData.valor_total.replace(',', '.')) || 0
          }
        ]
      };
      await api.post('/compras/pedidos', payload);
      showToast('Pedido registrado com sucesso!');
      setIsModalOpen(false);
      setFormData(initialFormData);
      fetchDados();
    } catch (error) {
      console.error(error);
      showToast('Erro ao criar pedido.', 'error');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/compras/pedidos/${id}/status?status=${newStatus}`);
      showToast(`Status atualizado para ${newStatus}`);
      fetchDados();
    } catch (err) {
      showToast('Erro ao atualizar status', 'error');
    }
  };

  const formatMoney = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // KPIs
  const stats = useMemo(() => {
    return {
      total: pedidos.length,
      cotacao: pedidos.filter(p => p.status === 'cotacao').length,
      aprovados: pedidos.filter(p => p.status === 'aprovado').length,
      recebidos: pedidos.filter(p => p.status === 'recebido' || p.status === 'pago').length,
      valorAprovado: pedidos.filter(p => p.status !== 'cotacao').reduce((acc, p) => acc + (p.valor_total || 0), 0)
    };
  }, [pedidos]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'cotacao': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'aprovado': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'recebido': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'pago': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'cotacao': return <Clock className="w-3.5 h-3.5" />;
      case 'aprovado': return <Truck className="w-3.5 h-3.5" />;
      case 'recebido': return <Layers className="w-3.5 h-3.5" />;
      case 'pago': return <CheckCircle2 className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-bounce-short ${
          toast.type === 'error' 
            ? 'bg-rose-950/90 border-rose-800 text-rose-200' 
            : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Cadeia de Suprimentos
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-emerald-400" />
            Compras e Pedidos
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Gerencie cotações, pedidos de materiais e recebimentos nas obras.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsFornecedorModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-all cursor-pointer"
          >
            <Building className="w-4 h-4 text-slate-400" />
            <span>Fornecedor</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Pedido</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Cotações Abertas</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white tracking-tight">{stats.cotacao}</span>
            <span className="text-xs text-slate-400 block mt-0.5">pedidos aguardando</span>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Em Trânsito (Aprovados)</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-amber-400 tracking-tight">{stats.aprovados}</span>
            <span className="text-xs text-slate-400 block mt-0.5">aguardando recebimento</span>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Materiais Recebidos</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-blue-400 tracking-tight">{stats.recebidos}</span>
            <span className="text-xs text-slate-400 block mt-0.5">na obra</span>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Total Aprovado</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">{formatMoney(stats.valorAprovado)}</span>
            <span className="text-xs text-slate-400 block mt-0.5">comprometido</span>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="border-b border-slate-800 flex items-center gap-6">
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`flex items-center gap-2.5 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'pedidos'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Pedidos de Compra</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-normal">
            {pedidos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('fornecedores')}
          className={`flex items-center gap-2.5 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'fornecedores'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Diretório de Fornecedores</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-normal">
            {fornecedores.length}
          </span>
        </button>
      </div>

      {/* ABA: PEDIDOS */}
      {activeTab === 'pedidos' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-slate-400 py-10 text-center">Carregando pedidos...</div>
          ) : pedidos.length === 0 ? (
            <div className="text-slate-500 py-10 text-center border border-slate-800 border-dashed rounded-xl">
              Nenhum pedido de compra registrado.
            </div>
          ) : (
            pedidos.map((pedido) => (
              <div key={pedido.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1.5 border ${getStatusColor(pedido.status)}`}>
                      {getStatusIcon(pedido.status)}
                      {pedido.status}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{pedido.numero}</span>
                    <span className="text-xs text-slate-500">• {pedido.obra_nome}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {pedido.fornecedor_nome}
                  </h3>
                  <div className="mt-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row justify-between gap-2">
                    <div>
                      <span className="text-slate-400 font-medium">Itens: </span>
                      {pedido.itens_lista?.map(i => i.descricao).join(', ') || 'Sem itens'}
                    </div>
                    <div className="text-slate-400 shrink-0">
                      Entrega: <span className="text-slate-200 font-semibold">{formatDate(pedido.data_entrega_prevista)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between items-end min-w-[200px]">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Valor do Pedido</span>
                    <span className="text-2xl font-bold text-white">
                      {formatMoney(pedido.valor_total)}
                    </span>
                    {pedido.created_by && (
                      <span className="text-[9px] text-slate-500 block mt-1">
                        Autorizado por {pedido.created_by === user?.id ? 'Você' : 'Sócio'}
                      </span>
                    )}
                  </div>
                  
                  {/* Status Workflow Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    {pedido.status === 'cotacao' && (
                      <button onClick={() => handleStatusChange(pedido.id, 'aprovado')} className="text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-all flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar Compra
                      </button>
                    )}
                    {pedido.status === 'aprovado' && (
                      <button onClick={() => handleStatusChange(pedido.id, 'recebido')} className="text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-all flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" /> Marcar Recebido
                      </button>
                    )}
                    {pedido.status === 'recebido' && (
                      <button onClick={() => handleStatusChange(pedido.id, 'pago')} className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-all flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> Marcar Pago
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ABA: FORNECEDORES */}
      {activeTab === 'fornecedores' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fornecedores.map(f => (
              <div key={f.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-lg">{f.nome}</h3>
                    {f.cnpj && <p className="text-xs text-slate-400 font-mono mt-0.5">CNPJ: {formatCNPJ(f.cnpj) || f.cnpj}</p>}
                  </div>
                  <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                    <Building className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-500" /> {formatTelefone(f.telefone) || f.telefone || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-500" /> {f.email || 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modais de Cadastro (permanecem quase inalterados visualmente, só padronizados) */}
      {isFornecedorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Novo Fornecedor</h3>
              </div>
              <button onClick={() => setIsFornecedorModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form id="forn-form" onSubmit={handleCreateFornecedor} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Nome do Fornecedor *</label>
                  <input type="text" name="nome" required value={fornData.nome} onChange={handleFornInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-slate-300">CNPJ</label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {fornData.cnpj ? `${fornData.cnpj.replace(/\D/g, '').length}/14` : 'Máx 14 dígitos'}
                    </span>
                  </div>
                  <input 
                    type="text" 
                    name="cnpj" 
                    value={fornData.cnpj} 
                    maxLength={18}
                    placeholder="00.000.000/0000-00"
                    onChange={handleFornInputChange} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none font-mono placeholder:text-slate-600" 
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-slate-300">Telefone</label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {fornData.telefone ? `${fornData.telefone.replace(/\D/g, '').length}/11` : 'Máx 11 dígitos'}
                    </span>
                  </div>
                  <input 
                    type="text" 
                    name="telefone" 
                    value={fornData.telefone} 
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    onChange={handleFornInputChange} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none font-mono placeholder:text-slate-600" 
                  />
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/30">
              <button onClick={() => setIsFornecedorModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white">Cancelar</button>
              <button type="submit" form="forn-form" className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg">Salvar Fornecedor</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Novo Pedido de Compra</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="pedido-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">Obra *</label>
                    <select name="obra_id" required value={formData.obra_id} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                      <option value="">Selecione uma obra</option>
                      {obras?.map(o => (
                        <option key={o.id} value={o.id}>{o.nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">Fornecedor *</label>
                    <select name="fornecedor_id" required value={formData.fornecedor_id} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                      <option value="">Selecione um fornecedor</option>
                      {fornecedores?.map(f => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Descrição dos Itens / Material</label>
                  <input type="text" name="descricao_item" required value={formData.descricao_item} onChange={handleInputChange} placeholder="Ex: 120 placas Drywall ST" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">Data de Entrega Prevista</label>
                    <input type="date" name="data_entrega_prevista" required value={formData.data_entrega_prevista} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">Valor Total (R$) *</label>
                    <input type="number" step="0.01" name="valor_total" required value={formData.valor_total} onChange={handleInputChange} placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/30">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800">Cancelar</button>
              <button type="submit" form="pedido-form" className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg">Emitir Pedido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

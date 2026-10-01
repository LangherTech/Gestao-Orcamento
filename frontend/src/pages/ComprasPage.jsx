import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, CheckCircle2, Clock, Truck, Layers, X, DollarSign, Building } from 'lucide-react';
import api from '../services/api';

export default function ComprasPage({ obras }) {
  const [pedidos, setPedidos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFornecedorModalOpen, setIsFornecedorModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    obra_id: '',
    fornecedor_id: '',
    data_pedido: new Date().toISOString().split('T')[0],
    data_entrega_prevista: '',
    valor_total: '',
    descricao_item: ''
  });

  const [fornData, setFornData] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email: ''
  });

  const fetchDados = async () => {
    setIsLoading(true);
    try {
      const [resPedidos, resForn] = await Promise.all([
        api.get('/compras/pedidos'),
        api.get('/compras/fornecedores')
      ]);
      setPedidos(resPedidos.data || []);
      setFornecedores(resForn.data || []);
    } catch (error) {
      console.error("Erro ao buscar dados de compras:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFornInputChange = (e) => {
    const { name, value } = e.target;
    setFornData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateFornecedor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/compras/fornecedores', fornData);
      setIsFornecedorModalOpen(false);
      setFornData({ nome: '', cnpj: '', telefone: '', email: '' });
      fetchDados();
    } catch (error) {
      console.error(error);
      alert('Erro ao criar fornecedor.');
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
      setIsModalOpen(false);
      setFormData({
        obra_id: '',
        fornecedor_id: '',
        data_pedido: new Date().toISOString().split('T')[0],
        data_entrega_prevista: '',
        valor_total: '',
        descricao_item: ''
      });
      fetchDados();
    } catch (error) {
      console.error(error);
      alert('Erro ao criar pedido.');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Compras & Pedidos de Insumos</h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestão de fornecedores e controle de pedidos para dedução automática no orçamento.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsFornecedorModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-all cursor-pointer"
          >
            <Building className="w-4 h-4 text-emerald-400" />
            <span>Novo Fornecedor</span>
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

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-slate-400 py-10 text-center">Carregando pedidos...</div>
        ) : pedidos.length === 0 ? (
          <div className="text-slate-500 py-10 text-center border border-slate-800 border-dashed rounded-xl">
            Nenhum pedido de compra encontrado.
          </div>
        ) : (
          pedidos.map((pedido) => (
            <div key={pedido.id} className="glass-card p-5 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                      pedido.status === 'aprovado' || pedido.status === 'pago' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : pedido.status === 'recebido'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {pedido.status}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{pedido.numero}</span>
                    <span className="text-xs text-slate-500">• {pedido.obra_nome}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{pedido.fornecedor_nome}</h3>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Valor Total</span>
                    <span className="text-lg font-bold text-white">
                      {formatMoney(pedido.valor_total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row justify-between gap-2">
                <div>
                  <span className="text-slate-400 font-medium">Itens: </span>
                  {pedido.itens_lista?.map(i => i.descricao).join(', ') || 'Sem itens'}
                </div>
                <div className="text-slate-400 shrink-0">
                  Previsão de Entrega: <span className="text-slate-200 font-semibold">{formatDate(pedido.data_entrega_prevista)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Novo Fornecedor */}
      {isFornecedorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Novo Fornecedor</h3>
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
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">CNPJ</label>
                  <input type="text" name="cnpj" value={fornData.cnpj} onChange={handleFornInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Telefone</label>
                  <input type="text" name="telefone" value={fornData.telefone} onChange={handleFornInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/20">
              <button onClick={() => setIsFornecedorModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white">Cancelar</button>
              <button type="submit" form="forn-form" className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Pedido */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-lg font-bold text-white">Novo Pedido de Compra</h3>
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
                  <label className="text-sm font-medium text-slate-300">Descrição do Item</label>
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
            
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/20">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800">Cancelar</button>
              <button type="submit" form="pedido-form" className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg">Registrar Pedido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


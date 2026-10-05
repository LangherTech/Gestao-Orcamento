import React, { useState, useEffect } from 'react';
import { History, Search, Filter, ShieldAlert, ArrowRight, User, RefreshCw } from 'lucide-react';
import api from '../services/api';

export default function RastreabilidadePage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/audit');
      setLogs(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar rastreabilidade", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('pt-BR');
  };

  const getActionColor = (action) => {
    if (action === 'CREATE' || action === 'POST') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (action === 'UPDATE' || action === 'PUT') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (action === 'DELETE') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const getActionName = (action) => {
    if (action === 'CREATE' || action === 'POST') return 'Criação';
    if (action === 'UPDATE' || action === 'PUT') return 'Edição';
    if (action === 'DELETE') return 'Exclusão';
    return action;
  };

  const filteredLogs = logs.filter(log => {
    const matchEntity = filterEntity === 'todas' || log.entity_type === filterEntity;
    const matchSearch = !searchTerm || (log.auth?.users?.email || 'Sistema').toLowerCase().includes(searchTerm.toLowerCase());
    return matchEntity && matchSearch;
  });

  const entities = [...new Set(logs.map(log => log.entity_type))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-400" />
            Rastreabilidade de Ações
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Histórico completo de auditoria: quem fez o quê, quando e onde.
          </p>
        </div>
        <button 
          onClick={fetchLogs}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          title="Atualizar Logs"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuário (e-mail)..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterEntity}
            onChange={e => setFilterEntity(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="todas">Todos os Módulos</option>
            {entities.map(e => (
              <option key={e} value={e}>{e.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 font-semibold">Data / Hora</th>
              <th className="px-6 py-4 font-semibold">Usuário</th>
              <th className="px-6 py-4 font-semibold">Ação</th>
              <th className="px-6 py-4 font-semibold">Módulo (Entidade)</th>
              <th className="px-6 py-4 font-semibold text-right">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading && logs.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-2"></div>
                  <p>Carregando histórico de auditoria...</p>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                  <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-base font-medium text-slate-400">Nenhum registro encontrado</p>
                  <p className="text-xs text-slate-500 mt-1">Ações como cadastros, edições e exclusões aparecerão aqui.</p>
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-slate-300 font-medium whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <span className="text-white font-medium">
                        {log.users?.email || 'Sistema / Desconhecido'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getActionColor(log.action)}`}>
                      {getActionName(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-300 uppercase text-xs font-bold tracking-wider">
                      {log.entity_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-2 text-slate-500 text-xs">
                      {log.entity_id && (
                        <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700" title="ID do Registro">
                          #{log.entity_id.substring(0,6)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

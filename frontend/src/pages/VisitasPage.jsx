import React, { useState, useEffect } from 'react';
import { 
  MapPin, Plus, Calendar, Search, Users, Target, TrendingUp, AlertCircle, 
  Camera, Filter, Phone, Mail, MessageCircle, FileText, Edit2, Trash2, 
  Clock, CheckCircle2, X, Crosshair, ExternalLink, Settings
} from 'lucide-react';
import api from '../services/api';
import { supabase } from '../services/supabase';
import { formatTelefone } from '../utils/masks';

export default function VisitasPage({ user, onCreateOrcamento }) {
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVisita, setEditingVisita] = useState(null);
  const [deletingVisita, setDeletingVisita] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  
  // Meta diária configurável
  const [metaDiaria, setMetaDiaria] = useState(() => {
    try {
      const saved = localStorage.getItem('edifica_meta_visitas');
      return saved ? parseInt(saved, 10) : 8;
    } catch {
      return 8;
    }
  });
  const [showConfigMeta, setShowConfigMeta] = useState(false);
  const [tempMeta, setTempMeta] = useState(metaDiaria);

  // Filtros
  const [filtroSocio, setFiltroSocio] = useState('Todos'); // 'Todos', 'Guilherme', 'Marcio'
  const [filtroClassificacao, setFiltroClassificacao] = useState('Todas'); // 'Todas', 'Potencial', 'Normal'
  const [filtroData, setFiltroData] = useState('Todas'); // 'Todas', 'Hoje', 'Ontem', 'Esta Semana', 'Este Mês', 'Intervalo'
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('todas'); // 'todas' | 'retornos'

  const initialForm = {
    nome: '',
    pessoa_contato: '',
    telefone: '',
    email: '',
    endereco: '',
    classificacao: 'Normal',
    observacao: '',
    data_visita: new Date().toISOString().split('T')[0],
    data_retorno: '',
    visitado_por: user?.id || '',
    foto_url: ''
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    if (user?.id && !editingVisita) {
      setFormData(prev => ({ ...prev, visitado_por: prev.visitado_por || user.id }));
    }
  }, [user, editingVisita]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/visitas');
      if (res.data) setVisitas(res.data);
    } catch (err) {
      console.error('Erro ao buscar visitas', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Identificação do usuário logado (Guilherme vs Marcio)
  const isGuilhermeUser = user?.email?.toLowerCase().includes('guilherme');
  const meuNome = isGuilhermeUser ? 'Guilherme' : 'Marcio';
  const nomeOutro = isGuilhermeUser ? 'Marcio' : 'Guilherme';
  
  // Encontra ID do outro sócio se já houver registros
  const visitasOutro = visitas.find(v => v.visitado_por && v.visitado_por !== user?.id);
  const outroSocioId = visitasOutro ? visitasOutro.visitado_por : 'outro_socio_id';

  // Geolocalização
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada pelo seu navegador.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Tentativa de Reverse Geocoding via OpenStreetMap Nominatim gratuito
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (response.ok) {
            const data = await response.json();
            const road = data.address?.road || '';
            const houseNumber = data.address?.house_number || '';
            const suburb = data.address?.suburb || data.address?.neighbourhood || '';
            const city = data.address?.city || data.address?.town || 'Blumenau';
            const formatted = [road, houseNumber, suburb, city].filter(Boolean).join(', ');
            setFormData(prev => ({ ...prev, endereco: formatted || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
          } else {
            setFormData(prev => ({ ...prev, endereco: `Coord: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
          }
        } catch {
          setFormData(prev => ({ ...prev, endereco: `Coord: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.warn('Erro ao obter localização', err);
        alert('Não foi possível obter sua localização atual. Verifique as permissões de GPS.');
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Abrir modal de criação
  const handleOpenCreate = () => {
    setEditingVisita(null);
    setFormData({
      ...initialForm,
      data_visita: new Date().toISOString().split('T')[0],
      visitado_por: user?.id || ''
    });
    setFotoFile(null);
    setShowModal(true);
  };

  // Abrir modal de edição
  const handleOpenEdit = (visita) => {
    setEditingVisita(visita);
    setFormData({
      nome: visita.nome || '',
      pessoa_contato: visita.pessoa_contato || '',
      telefone: visita.telefone || visita.contato ? formatTelefone(visita.telefone || visita.contato) : '',
      email: visita.email || '',
      endereco: visita.endereco || '',
      classificacao: visita.classificacao || 'Normal',
      observacao: visita.observacao || '',
      data_visita: visita.data_visita ? visita.data_visita.split('T')[0] : new Date().toISOString().split('T')[0],
      data_retorno: visita.data_retorno ? visita.data_retorno.split('T')[0] : '',
      visitado_por: visita.visitado_por || user?.id || '',
      foto_url: visita.foto_url || ''
    });
    setFotoFile(null);
    setShowModal(true);
  };

  // Salvar (Criar ou Editar)
  const handleSubmit = async (e, addAnother = false) => {
    e.preventDefault();
    setUploading(true);
    let fotoUrl = formData.foto_url || null;

    try {
      if (fotoFile) {
        const fileExt = fotoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('visitas')
          .upload(fileName, fotoFile);
          
        if (uploadError) {
          console.error("Erro no upload da foto", uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('visitas')
            .getPublicUrl(fileName);
          fotoUrl = publicUrl;
        }
      }

      const payload = { 
        ...formData, 
        foto_url: fotoUrl,
        contato: formData.telefone // sincroniza campo antigo
      };

      if (!payload.data_retorno) delete payload.data_retorno;
      if (!payload.visitado_por) delete payload.visitado_por;

      if (editingVisita) {
        // Atualização (PUT)
        await api.put(`/visitas/${editingVisita.id}`, payload);
        setShowModal(false);
        setEditingVisita(null);
      } else {
        // Criação (POST)
        await api.post('/visitas', payload);
        if (addAnother) {
          setFormData(prev => ({
            ...initialForm,
            data_visita: prev.data_visita,
            visitado_por: prev.visitado_por
          }));
        } else {
          setShowModal(false);
        }
      }
      
      setFotoFile(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar visita', err);
      alert('Erro ao salvar os dados. Verifique a conexão com o servidor.');
    } finally {
      setUploading(false);
    }
  };

  // Exclusão com confirmação
  const handleConfirmDelete = async () => {
    if (!deletingVisita) return;
    try {
      await api.delete(`/visitas/${deletingVisita.id}`);
      setVisitas(prev => prev.filter(v => v.id !== deletingVisita.id));
      setDeletingVisita(null);
    } catch (err) {
      console.error('Erro ao excluir visita', err);
      alert('Erro ao excluir cliente.');
    }
  };

  // Salvar nova meta diária
  const handleSaveMeta = () => {
    const val = parseInt(tempMeta, 10);
    if (!isNaN(val) && val > 0) {
      setMetaDiaria(val);
      localStorage.setItem('edifica_meta_visitas', val.toString());
    }
    setShowConfigMeta(false);
  };

  // Cálculos de métricas do dia de hoje
  const todayStr = new Date().toISOString().split('T')[0];
  const visitasHoje = visitas.filter(v => v.data_visita && v.data_visita.split('T')[0] === todayStr);
  const totalVisitasHoje = visitasHoje.length;
  const porcentagemMeta = Math.min(Math.round((totalVisitasHoje / metaDiaria) * 100), 100);
  const potenciaisHoje = visitasHoje.filter(v => v.classificacao === 'Potencial').length;

  // Individual hoje
  const visitasGuilhermeHoje = visitasHoje.filter(v => 
    isGuilhermeUser ? (v.visitado_por === user?.id) : (v.visitado_por !== user?.id)
  ).length;
  const visitasMarcioHoje = visitasHoje.filter(v => 
    isGuilhermeUser ? (v.visitado_por !== user?.id) : (v.visitado_por === user?.id)
  ).length;

  // Retornos
  const hojeDate = new Date();
  hojeDate.setHours(0, 0, 0, 0);

  const retornosPendentes = visitas.filter(v => {
    if (!v.data_retorno) return false;
    const rDate = new Date(v.data_retorno + 'T12:00:00');
    return rDate <= new Date(); // hoje ou atrasado
  });

  // Lógica de Filtragem
  const filteredVisitas = visitas.filter(v => {
    // Filtro por Aba de Retornos
    if (abaAtiva === 'retornos') {
      if (!v.data_retorno) return false;
    }

    // Filtro por Sócio
    let passaSocio = true;
    if (filtroSocio === 'Guilherme') {
      passaSocio = isGuilhermeUser ? (v.visitado_por === user?.id) : (v.visitado_por !== user?.id);
    } else if (filtroSocio === 'Marcio') {
      passaSocio = isGuilhermeUser ? (v.visitado_por !== user?.id) : (v.visitado_por === user?.id);
    }

    // Filtro Classificação
    let passaClassificacao = true;
    if (filtroClassificacao !== 'Todas') {
      passaClassificacao = v.classificacao === filtroClassificacao;
    }

    // Filtro Busca Texto
    let passaTexto = true;
    if (buscaTexto.trim()) {
      const termo = buscaTexto.toLowerCase();
      passaTexto = (
        (v.nome && v.nome.toLowerCase().includes(termo)) ||
        (v.pessoa_contato && v.pessoa_contato.toLowerCase().includes(termo)) ||
        (v.telefone && v.telefone.toLowerCase().includes(termo)) ||
        (v.contato && v.contato.toLowerCase().includes(termo)) ||
        (v.email && v.email.toLowerCase().includes(termo)) ||
        (v.endereco && v.endereco.toLowerCase().includes(termo)) ||
        (v.observacao && v.observacao.toLowerCase().includes(termo))
      );
    }

    // Filtro de Data
    let passaData = true;
    if (v.data_visita) {
      const dataVisitaObj = new Date(v.data_visita + 'T12:00:00');
      const hojeObj = new Date();
      hojeObj.setHours(12, 0, 0, 0);
      
      const ontemObj = new Date(hojeObj);
      ontemObj.setDate(ontemObj.getDate() - 1);

      if (filtroData === 'Hoje') {
        passaData = dataVisitaObj.toDateString() === hojeObj.toDateString();
      } else if (filtroData === 'Ontem') {
        passaData = dataVisitaObj.toDateString() === ontemObj.toDateString();
      } else if (filtroData === 'Esta Semana') {
        const diaSemana = hojeObj.getDay();
        const inicioSemana = new Date(hojeObj);
        inicioSemana.setDate(hojeObj.getDate() - diaSemana);
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 6);
        passaData = dataVisitaObj >= inicioSemana && dataVisitaObj <= fimSemana;
      } else if (filtroData === 'Este Mês') {
        passaData = dataVisitaObj.getMonth() === hojeObj.getMonth() && dataVisitaObj.getFullYear() === hojeObj.getFullYear();
      } else if (filtroData === 'Intervalo') {
        if (dataInicio && dataFim) {
          const ini = new Date(dataInicio + 'T00:00:00');
          const fim = new Date(dataFim + 'T23:59:59');
          passaData = dataVisitaObj >= ini && dataVisitaObj <= fim;
        }
      }
    }

    return passaSocio && passaClassificacao && passaTexto && passaData;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">Visitas & Prospecção</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {visitas.length} clientes
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Gestão compartilhada de prospecção, metas diárias de campo e integração direta com orçamentos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
              showFilters 
                ? 'bg-slate-700 text-white border-slate-600' 
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/70'
            }`}
          >
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Filtros</span>
          </button>
          
          <button 
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Visita</span>
          </button>
        </div>
      </div>

      {/* KPIs & Painel de Metas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Meta Diária da Equipe */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Target className="w-5 h-5" />
                <h3 className="font-semibold text-sm">Meta Diária (Equipe)</h3>
                <button 
                  onClick={() => setShowConfigMeta(true)}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                  title="Configurar valor da meta diária"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400">Total somado hoje em campo</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-white">{totalVisitasHoje}</span>
              <span className="text-slate-500 font-medium"> / {metaDiaria}</span>
            </div>
          </div>
          
          <div>
            <div className="w-full bg-slate-800 rounded-full h-3 mb-1.5 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-1000 ${
                  porcentagemMeta >= 100 
                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' 
                    : 'bg-gradient-to-r from-emerald-600 to-teal-400'
                }`} 
                style={{ width: `${porcentagemMeta}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>{porcentagemMeta}% concluído</span>
              <span>{Math.max(0, metaDiaria - totalVisitasHoje)} restantes</span>
            </div>
          </div>
        </div>

        {/* Divisão Individual por Sócio */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-blue-400">
              <Users className="w-5 h-5" />
              <h3 className="font-semibold text-sm">Desempenho Individual (Hoje)</h3>
            </div>
          </div>
          
          <div className="space-y-2.5 mt-1">
            <div className="flex justify-between items-center bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/50">
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Guilherme
              </span>
              <span className="text-sm font-bold text-white">{visitasGuilhermeHoje} visitas</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/50">
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Marcio
              </span>
              <span className="text-sm font-bold text-white">{visitasMarcioHoje} visitas</span>
            </div>
          </div>
        </div>

        {/* Potenciais & Retornos Pendentes */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-amber-400">
              <TrendingUp className="w-5 h-5" />
              <h3 className="font-semibold text-sm">Oportunidades & Follow-up</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
              <p className="text-[11px] text-slate-400">Potenciais Hoje</p>
              <p className="text-xl font-bold text-amber-400 mt-0.5">{potenciaisHoje}</p>
            </div>
            <div 
              onClick={() => setAbaAtiva('retornos')}
              className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/50 cursor-pointer hover:border-amber-500/40 transition-colors"
            >
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Retornos Pendentes
              </p>
              <p className="text-xl font-bold text-white mt-0.5">
                {retornosPendentes.length}
                {retornosPendentes.length > 0 && (
                  <span className="text-[10px] text-amber-400 font-normal ml-1.5">(atenção)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Abas Rápidas: Todas vs Retornos */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setAbaAtiva('todas')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            abaAtiva === 'todas'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Todas as Visitas ({visitas.length})
        </button>
        <button
          onClick={() => setAbaAtiva('retornos')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            abaAtiva === 'retornos'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Retornos Agendados
          {retornosPendentes.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold">
              {retornosPendentes.length}
            </span>
          )}
        </button>
      </div>

      {/* Interface de Filtros */}
      {showFilters && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">Buscar</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input 
                  type="text" 
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  placeholder="Nome do cliente, contato, telefone, endereço..." 
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Responsável</label>
                <select 
                  value={filtroSocio} 
                  onChange={(e) => setFiltroSocio(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Todos">Guilherme e Marcio</option>
                  <option value="Guilherme">Guilherme</option>
                  <option value="Marcio">Marcio</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Classificação</label>
                <select 
                  value={filtroClassificacao} 
                  onChange={(e) => setFiltroClassificacao(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Todas">Todas</option>
                  <option value="Potencial">Potencial (Quente)</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Data da Visita</label>
                <select 
                  value={filtroData} 
                  onChange={(e) => setFiltroData(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Todas">Todo Período</option>
                  <option value="Hoje">Hoje</option>
                  <option value="Ontem">Ontem</option>
                  <option value="Esta Semana">Esta Semana</option>
                  <option value="Este Mês">Este Mês</option>
                  <option value="Intervalo">Intervalo Livre...</option>
                </select>
              </div>
            </div>
          </div>

          {filtroData === 'Intervalo' && (
            <div className="grid grid-cols-2 max-w-xs gap-3 mt-3 ml-auto">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Data Início</label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Data Fim</label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid de Cartões de Clientes / Visitas */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisitas.map((v) => {
            const foiGuilherme = isGuilhermeUser ? (v.visitado_por === user?.id) : (v.visitado_por !== user?.id);
            const nomeResponsavel = foiGuilherme ? 'Guilherme' : 'Marcio';
            const telLimpo = (v.telefone || v.contato || '').replace(/\D/g, '');
            const temRetorno = !!v.data_retorno;
            const retornoDate = temRetorno ? new Date(v.data_retorno + 'T12:00:00') : null;
            const retornoAtrasado = retornoDate && retornoDate < hojeDate;
            const retornoHoje = retornoDate && retornoDate.toDateString() === hojeDate.toDateString();

            return (
              <div 
                key={v.id} 
                className="glass-card p-5 rounded-2xl flex flex-col justify-between border border-slate-800/80 bg-slate-900/60 hover:border-slate-700/80 transition-all shadow-md group"
              >
                <div>
                  {/* Topo do Card */}
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-white tracking-tight truncate group-hover:text-emerald-400 transition-colors">
                        {v.nome}
                      </h4>
                      {v.pessoa_contato && (
                        <p className="text-xs text-slate-300 font-medium truncate flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span>{v.pessoa_contato}</span>
                        </p>
                      )}
                    </div>
                    
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                      v.classificacao === 'Potencial' 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                    }`}>
                      {v.classificacao}
                    </span>
                  </div>
                  
                  {/* Dados de Contato e Endereço */}
                  <div className="space-y-1.5 mt-3">
                    {v.endereco && (
                      <p className="text-xs text-slate-400 flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{v.endereco}</span>
                      </p>
                    )}
                    
                    {(v.telefone || v.contato) && (
                      <div className="flex items-center justify-between text-xs text-slate-300 pt-0.5">
                        <span className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{v.telefone || v.contato}</span>
                        </span>
                        
                        {/* Ações Rápidas de Telefone / WhatsApp */}
                        {telLimpo && (
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <a 
                              href={`https://wa.me/55${telLimpo}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                              title="Abrir no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                            <a 
                              href={`tel:${telLimpo}`}
                              className="p-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                              title="Ligar"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {v.email && (
                      <p className="text-xs text-slate-400 flex items-center justify-between pt-0.5">
                        <span className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{v.email}</span>
                        </span>
                        <a 
                          href={`mailto:${v.email}`}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0 ml-2"
                          title="Enviar e-mail"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    )}
                  </div>

                  {/* Observações */}
                  {v.observacao && (
                    <div className="mt-3 p-2 rounded-xl bg-slate-950/40 border border-slate-800/40">
                      <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                        "{v.observacao}"
                      </p>
                    </div>
                  )}

                  {/* Badge de Retorno se houver */}
                  {temRetorno && (
                    <div className="mt-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                        retornoAtrasado
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : retornoHoje
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        <Clock className="w-3 h-3" />
                        Retorno: {new Date(v.data_retorno + 'T12:00:00').toLocaleDateString('pt-BR')}
                        {retornoHoje && ' (Hoje!)'}
                        {retornoAtrasado && ' (Atrasado)'}
                      </span>
                    </div>
                  )}

                  {/* Foto da Visita */}
                  {v.foto_url && (
                    <div className="mt-3 w-full h-32 rounded-xl overflow-hidden border border-slate-700/50 relative group/img">
                      <img src={v.foto_url} alt="Foto da visita" className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105" />
                      <a 
                        href={v.foto_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="absolute bottom-2 right-2 px-2 py-1 bg-slate-950/80 rounded-md text-[10px] text-slate-300 hover:text-white flex items-center gap-1"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        Ver foto
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Rodapé e Ações */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-500/70" /> 
                      {new Date(v.data_visita + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800/60">
                      <Users className="w-3 h-3 text-blue-400/80" /> 
                      {nomeResponsavel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {/* Botão Primário: Criar Orçamento a partir do Cliente */}
                    <button
                      onClick={() => onCreateOrcamento && onCreateOrcamento(v)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-500 transition-all cursor-pointer shadow-sm"
                      title="Gerar Orçamento formal com dados pré-preenchidos"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Criar Orçamento</span>
                    </button>

                    {/* Editar */}
                    <button
                      onClick={() => handleOpenEdit(v)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
                      title="Editar cadastro da visita"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Excluir */}
                    <button
                      onClick={() => setDeletingVisita(v)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 transition-colors cursor-pointer"
                      title="Excluir visita"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredVisitas.length === 0 && (
            <div className="col-span-1 md:col-span-3 text-center py-16 bg-slate-900/20 rounded-2xl border border-slate-800/50">
              <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 font-medium">Nenhuma visita encontrada.</p>
              <p className="text-xs text-slate-500 mt-1">
                {abaAtiva === 'retornos' 
                  ? 'Nenhum cliente com data de retorno cadastrada.' 
                  : 'Tente alterar ou limpar os filtros.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal Nova / Editar Visita */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingVisita ? 'Editar Cadastro do Cliente' : 'Registrar Visita de Prospecção'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingVisita 
                    ? 'Atualize contatos, pessoa responsável, classificação e notas' 
                    : 'Cadastre os dados essenciais levantados em campo'}
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Nome do Cliente */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Cliente / Razão Social *
                </label>
                <input 
                  required 
                  type="text" 
                  value={formData.nome} 
                  onChange={e => setFormData({ ...formData, nome: e.target.value })} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600" 
                  placeholder="Ex: Condomínio Residencial Bella Vista ou Nome do Proprietário" 
                />
              </div>

              {/* Pessoa de Contato */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pessoa de Contato (Responsável)
                </label>
                <input 
                  type="text" 
                  value={formData.pessoa_contato} 
                  onChange={e => setFormData({ ...formData, pessoa_contato: e.target.value })} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-600" 
                  placeholder="Ex: Síndico Roberto, Eng. Marcos, Dona Sílvia" 
                />
              </div>

              {/* Telefone e E-mail */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input 
                    type="text" 
                    value={formData.telefone} 
                    maxLength={15}
                    onChange={e => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-600 font-mono" 
                    placeholder="(47) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mail
                  </label>
                  <input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-600" 
                    placeholder="contato@cliente.com.br"
                  />
                </div>
              </div>

              {/* Endereço com Geolocalização */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Endereço da Obra / Local
                  </label>
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locating}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <Crosshair className={`w-3 h-3 ${locating ? 'animate-spin' : ''}`} />
                    <span>{locating ? 'Obtendo GPS...' : 'Usar minha localização'}</span>
                  </button>
                </div>
                <input 
                  type="text" 
                  value={formData.endereco} 
                  onChange={e => setFormData({ ...formData, endereco: e.target.value })} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-600" 
                  placeholder="Rua, Número, Bairro, Cidade" 
                />
              </div>

              {/* Classificação e Quem Visitou */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Classificação</label>
                  <select 
                    value={formData.classificacao} 
                    onChange={e => setFormData({ ...formData, classificacao: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Normal">Normal (Contato padrão)</option>
                    <option value="Potencial">Potencial (Obra quente / imediata)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Feita por (Responsável)</label>
                  <select 
                    value={formData.visitado_por} 
                    onChange={e => setFormData({ ...formData, visitado_por: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={user?.id || ''}>Eu ({meuNome})</option>
                    <option value={outroSocioId}>Outro ({nomeOutro})</option>
                  </select>
                </div>
              </div>

              {/* Data da Visita e Data de Retorno */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Data da Visita *</label>
                  <input 
                    required 
                    type="date" 
                    value={formData.data_visita} 
                    onChange={e => setFormData({ ...formData, data_visita: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data de Retorno (Follow-up)
                  </label>
                  <input 
                    type="date" 
                    value={formData.data_retorno} 
                    onChange={e => setFormData({ ...formData, data_retorno: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" 
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações Gerais / Escopo Levantado
                </label>
                <textarea 
                  value={formData.observacao} 
                  onChange={e => setFormData({ ...formData, observacao: e.target.value })} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 h-20 resize-none placeholder-slate-600" 
                  placeholder="Detalhes da conversa, dores do cliente, serviços necessários..."
                ></textarea>
              </div>

              {/* Upload de Foto */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Foto da Fachada / Local da Obra
                </label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setFotoFile(e.target.files[0])} 
                    className="hidden" 
                    id="foto-upload" 
                  />
                  <label 
                    htmlFor="foto-upload" 
                    className="w-full bg-slate-950 border border-slate-800 border-dashed rounded-xl px-3 py-3.5 text-sm text-slate-400 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-slate-900 transition-colors"
                  >
                    <Camera className="w-5 h-5 mb-1.5 text-slate-500" />
                    <span className="text-xs text-center text-slate-400">
                      {fotoFile ? fotoFile.name : (formData.foto_url ? 'Foto já anexada (clique para substituir)' : 'Tocar para abrir Câmera ou Galeria')}
                    </span>
                  </label>
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="sm:w-1/4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors" 
                  disabled={uploading}
                >
                  Cancelar
                </button>
                
                <div className="flex flex-1 gap-2">
                  {!editingVisita && (
                    <button 
                      type="button" 
                      onClick={(e) => handleSubmit(e, true)} 
                      className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium flex justify-center items-center gap-2 border border-slate-700 transition-colors" 
                      disabled={uploading}
                    >
                      {uploading ? 'Salvando...' : 'Salvar e +1'}
                    </button>
                  )}
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all" 
                    disabled={uploading}
                  >
                    {uploading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                    <span>{uploading ? 'Salvando...' : (editingVisita ? 'Salvar Alterações' : 'Salvar e Fechar')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletingVisita && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <h3 className="text-base font-bold text-white text-center">
              Excluir Cliente / Visita?
            </h3>
            <p className="text-xs text-slate-400 text-center mt-2">
              Tem certeza que deseja excluir o cadastro de <strong className="text-white">"{deletingVisita.nome}"</strong>?
              Esta ação removerá o registro e não poderá ser desfeita.
            </p>

            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeletingVisita(null)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-500/25 transition-all"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configurar Meta Diária */}
      {showConfigMeta && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xs p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              Meta Diária de Visitas
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Defina a quantidade mínima de visitas diárias para a equipe.
            </p>

            <div className="my-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">Visitas por dia</label>
              <input
                type="number"
                min="1"
                max="50"
                value={tempMeta}
                onChange={(e) => setTempMeta(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-base font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfigMeta(false)}
                className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMeta}
                className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold"
              >
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

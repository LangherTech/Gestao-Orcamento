import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Calendar, Search, Users, Target, TrendingUp, AlertCircle, Camera } from 'lucide-react';
import api from '../services/api';
import { supabase } from '../services/supabase';

export default function VisitasPage() {
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [fotoFile, setFotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    contato: '',
    classificacao: 'Normal',
    observacao: '',
    data_visita: new Date().toISOString().split('T')[0]
  });

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

  const handleSubmit = async (e, addAnother = false) => {
    e.preventDefault();
    setUploading(true);
    let fotoUrl = null;

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

      await api.post('/visitas', { ...formData, foto_url: fotoUrl });
      
      if (addAnother) {
        setFormData(prev => ({
          nome: '',
          endereco: '',
          contato: '',
          classificacao: 'Normal',
          observacao: '',
          data_visita: prev.data_visita // Mantém a data para agilizar o lote
        }));
      } else {
        setShowModal(false);
        setFormData({
          nome: '',
          endereco: '',
          contato: '',
          classificacao: 'Normal',
          observacao: '',
          data_visita: new Date().toISOString().split('T')[0]
        });
      }
      
      setFotoFile(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao cadastrar visita', err);
      alert('Erro ao salvar os dados.');
    } finally {
      setUploading(false);
    }
  };

  // Cálculo da meta diária
  const todayStr = new Date().toISOString().split('T')[0];
  const visitasHoje = visitas.filter(v => v.data_visita === todayStr);
  const totalVisitasHoje = visitasHoje.length;
  const metaDiaria = 8;
  const porcentagemMeta = Math.min(Math.round((totalVisitasHoje / metaDiaria) * 100), 100);
  const potenciaisHoje = visitasHoje.filter(v => v.classificacao === 'Potencial').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Visitas & Prospecção</h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestão de visitas a clientes, prospecção e controle de classificação.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Visita</span>
        </button>
      </div>

      {/* Meta Diária Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col justify-center">
          <div className="flex justify-between items-end mb-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Target className="w-5 h-5" />
                <h3 className="font-semibold text-sm">Meta Diária de Visitas</h3>
              </div>
              <p className="text-xs text-slate-400">Total somado da equipe hoje</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-white">{totalVisitasHoje}</span>
              <span className="text-slate-500 font-medium"> / {metaDiaria}</span>
            </div>
          </div>
          
          <div className="w-full bg-slate-800 rounded-full h-3 mb-1 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all duration-1000 ${porcentagemMeta >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-600 to-teal-400'}`} 
              style={{ width: `${porcentagemMeta}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-slate-500 text-right font-medium">{porcentagemMeta}% concluído</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-semibold text-sm">Desempenho (Hoje)</h3>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-slate-300">Clientes Potenciais</span>
            <span className="text-lg font-bold text-amber-400">{potenciaisHoje}</span>
          </div>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800">
            <span className="text-sm text-slate-300">Visitas Normais</span>
            <span className="text-lg font-bold text-white">{totalVisitasHoje - potenciaisHoje}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visitas.map((v) => (
            <div key={v.id} className="glass-card p-5 rounded-2xl flex flex-col justify-between border border-slate-800/60 bg-slate-900/50">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-base font-bold text-white">{v.nome}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                    v.classificacao === 'Potencial' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {v.classificacao}
                  </span>
                </div>
                
                {v.endereco && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{v.endereco}</span>
                  </p>
                )}
                
                {v.contato && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{v.contato}</span>
                  </p>
                )}

                {v.observacao && (
                  <p className="text-[11px] text-slate-500 mt-3 line-clamp-2 italic">
                    "{v.observacao}"
                  </p>
                )}

                {v.foto_url && (
                  <div className="mt-3 w-full h-32 rounded-lg overflow-hidden border border-slate-700/50">
                    <img src={v.foto_url} alt="Foto do local" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-800/50 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(v.data_visita).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          ))}
          {visitas.length === 0 && (
            <div className="col-span-1 md:col-span-3 text-center py-10 text-slate-500">
              Nenhuma visita cadastrada.
            </div>
          )}
        </div>
      )}

      {/* Modal Nova Visita */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Registrar Visita</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome / Cliente</label>
                <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="Ex: Condomínio XYZ" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Endereço</label>
                <input type="text" value={formData.endereco} onChange={e => setFormData({...formData, endereco: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="Rua, Número, Bairro" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Contato (Tel/Whats)</label>
                  <input type="text" value={formData.contato} onChange={e => setFormData({...formData, contato: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Classificação</label>
                  <select value={formData.classificacao} onChange={e => setFormData({...formData, classificacao: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                    <option value="Normal">Normal</option>
                    <option value="Potencial">Potencial</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Data da Visita</label>
                <input required type="date" value={formData.data_visita} onChange={e => setFormData({...formData, data_visita: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Observações</label>
                <textarea value={formData.observacao} onChange={e => setFormData({...formData, observacao: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 h-20 resize-none" placeholder="Detalhes do que foi conversado..."></textarea>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Foto da Fachada / Local</label>
                <div className="relative">
                  <input type="file" accept="image/*" onChange={(e) => setFotoFile(e.target.files[0])} className="hidden" id="foto-upload" />
                  <label htmlFor="foto-upload" className="w-full bg-slate-950 border border-slate-800 border-dashed rounded-xl px-3 py-4 text-sm text-slate-400 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-slate-900 transition-colors">
                    <Camera className="w-6 h-6 mb-2 text-slate-500" />
                    <span className="text-center">{fotoFile ? fotoFile.name : 'Tocar para abrir Câmera/Galeria'}</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="sm:w-1/4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium" disabled={uploading}>Cancelar</button>
                <div className="flex flex-1 gap-2">
                  <button type="button" onClick={(e) => handleSubmit(e, true)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium flex justify-center items-center gap-2" disabled={uploading}>
                    {uploading ? 'Salvando...' : 'Salvar e +1'}
                  </button>
                  <button type="button" onClick={(e) => handleSubmit(e, false)} className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium flex justify-center items-center gap-2" disabled={uploading}>
                    {uploading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : null}
                    {uploading ? 'Salvando...' : 'Salvar Fechar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

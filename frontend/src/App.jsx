import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import ObrasPage from './pages/ObrasPage';
import ServicosPage from './pages/ServicosPage';
import CronogramaPage from './pages/CronogramaPage';
import RDOPage from './pages/RDOPage';
import ComprasPage from './pages/ComprasPage';
import GestaoPage from './pages/GestaoPage';
import CalendarioPage from './pages/CalendarioPage';
import FinanceiroPage from './pages/FinanceiroPage';
import api from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedObraId, setSelectedObraId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estados limpos iniciando do zero
  const [obras, setObras] = useState([]);

  const [kpis, setKpis] = useState({
    receita_total: 0.00,
    despesas_totais: 0.00,
    lucro_projetado: 0.00,
    margem_media_pct: 0.0,
    obras_ativas: 0,
    percentual_geral_conclusao: 0
  });

  const [lucratividadeObras, setLucratividadeObras] = useState([]);

  const [orcadoVsRealizado, setOrcadoVsRealizado] = useState([
    {
      id: "materiais",
      categoria: "Materiais & Compras",
      realizado: 0.0,
      orcado: 0.0,
      pct: 0.0,
      cor: "bg-blue-500",
      excedeu: false
    },
    {
      id: "empreiteiros",
      categoria: "Empreiteiros & Terceirizados",
      realizado: 0.0,
      orcado: 0.0,
      pct: 0.0,
      cor: "bg-amber-500",
      excedeu: false
    },
    {
      id: "caixa",
      categoria: "Caixa Pequeno do Canteiro",
      realizado: 0.0,
      orcado: 0.0,
      pct: 0.0,
      cor: "bg-emerald-500",
      excedeu: false
    }
  ]);

  // Função para carregar dados do backend FastAPI
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [obrasRes, kpisRes, lucroRes, orcadoRes] = await Promise.allSettled([
        api.get('/obras'),
        api.get(`/dashboards/kpis${selectedObraId ? `?obra_id=${selectedObraId}` : ''}`),
        api.get('/dashboards/lucratividade-por-obra'),
        api.get(`/dashboards/orcado-vs-realizado${selectedObraId ? `?obra_id=${selectedObraId}` : ''}`)
      ]);

      if (obrasRes.status === 'fulfilled' && obrasRes.value.data) {
        setObras(obrasRes.value.data);
      }
      if (kpisRes.status === 'fulfilled' && kpisRes.value.data) {
        setKpis(kpisRes.value.data);
      }
      if (lucroRes.status === 'fulfilled' && lucroRes.value.data) {
        setLucratividadeObras(lucroRes.value.data);
      }
      if (orcadoRes.status === 'fulfilled' && orcadoRes.value.data) {
        setOrcadoVsRealizado(orcadoRes.value.data);
      }
    } catch (err) {
      console.log('Operando com dados locais pré-carregados.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh a cada 5 minutos conforme especificado na regra de negócio
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedObraId]);

  const selectedObra = obras.find(o => o.id === selectedObraId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Barra Lateral de Navegação */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Cabeçalho */}
        <Header 
          obras={obras}
          selectedObraId={selectedObraId}
          setSelectedObraId={setSelectedObraId}
          onRefresh={fetchData}
          isRefreshing={isRefreshing}
        />

        {/* Corpo da Página */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardPage 
                selectedObra={selectedObra} 
                kpis={kpis} 
                lucratividadeObras={lucratividadeObras}
                orcadoVsRealizado={orcadoVsRealizado} 
              />
            )}
            {activeTab === 'obras' && (
              <ObrasPage 
                obras={obras} 
                onRefresh={fetchData}
                onSelectObra={(id) => {
                  setSelectedObraId(id);
                  setActiveTab('dashboard');
                }} 
              />
            )}
            {activeTab === 'servicos' && <ServicosPage />}
            {activeTab === 'cronograma' && <CronogramaPage selectedObraId={selectedObraId} />}
            {activeTab === 'rdo' && <RDOPage />}
            {activeTab === 'compras' && <ComprasPage obras={obras} />}
            {activeTab === 'gestao' && <GestaoPage obras={obras} />}
            {activeTab === 'calendario' && <CalendarioPage />}
            {activeTab === 'financeiro' && <FinanceiroPage selectedObraId={selectedObraId} obras={obras} />}
          </div>
        </main>
      </div>
    </div>
  );
}

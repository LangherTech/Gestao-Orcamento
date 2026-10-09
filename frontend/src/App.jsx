import React, { useState, useEffect, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import api from './services/api';
import { supabase } from './services/supabase';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy loading the pages for better performance (Code Splitting)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ObrasPage = lazy(() => import('./pages/ObrasPage'));
const ServicosPage = lazy(() => import('./pages/ServicosPage'));
const CronogramaPage = lazy(() => import('./pages/CronogramaPage'));
const RDOPage = lazy(() => import('./pages/RDOPage'));
const ComprasPage = lazy(() => import('./pages/ComprasPage'));
const GestaoPage = lazy(() => import('./pages/GestaoPage'));
const CalendarioPage = lazy(() => import('./pages/CalendarioPage'));
const FinanceiroPage = lazy(() => import('./pages/FinanceiroPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const VisitasPage = lazy(() => import('./pages/VisitasPage'));

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('edifica_active_tab');
    const validTabs = ['visitas', 'servicos', 'obras', 'dashboard', 'financeiro', 'cronograma', 'compras', 'gestao', 'rdo', 'calendario'];
    return saved && validTabs.includes(saved) ? saved : 'visitas';
  });
  const [selectedObraId, setSelectedObraId] = useState(() => {
    return localStorage.getItem('edifica_selected_obra_id') || null;
  });

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('edifica_active_tab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedObraId) {
      localStorage.setItem('edifica_selected_obra_id', selectedObraId);
    } else {
      localStorage.removeItem('edifica_selected_obra_id');
    }
  }, [selectedObraId]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingOrcamentoData, setPendingOrcamentoData] = useState(null);

  const handleCreateOrcamentoFromVisita = (visita) => {
    setPendingOrcamentoData({
      cliente_nome: visita.nome || '',
      pessoa_contato: visita.pessoa_contato || '',
      cliente_telefone: visita.telefone || visita.contato || '',
      cliente_email: visita.email || '',
      cliente_endereco: visita.endereco || '',
      visita_id: visita.id,
      notas: visita.observacao ? `Visita de Prospecção (${visita.data_visita || 'recente'}): ${visita.observacao}` : '',
      status: 'rascunho',
      prazo_dias: 10,
      prazo_garantia: '12 (doze) meses',
      validade_dias: 15
    });
    setActiveTab('servicos');
  };

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
      categoria: "Terceiros",
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
        api.get('/obras?arquivada=all'),
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        localStorage.setItem('edifica_token', session.access_token);
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        localStorage.setItem('edifica_token', session.access_token);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('edifica_token');
        localStorage.removeItem('edifica_active_tab');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchData();
      // Auto-refresh a cada 5 minutos conforme especificado na regra de negócio
      const interval = setInterval(fetchData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [selectedObraId, session]);

  const selectedObra = obras.find(o => o.id === selectedObraId) || null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
        </div>
      }>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 relative">
      {/* Barra Lateral de Navegação */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full">
        {/* Cabeçalho */}
        <Header 
          obras={obras}
          selectedObraId={selectedObraId}
          setSelectedObraId={setSelectedObraId}
          onRefresh={fetchData}
          isRefreshing={isRefreshing}
          user={session?.user}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Corpo da Página */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary key={activeTab}>
              <Suspense fallback={
                <div className="flex items-center justify-center h-full pt-20 text-emerald-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                </div>
              }>
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
                {activeTab === 'servicos' && (
                  <ServicosPage 
                    initialOrcamentoData={pendingOrcamentoData}
                    onClearInitialOrcamentoData={() => setPendingOrcamentoData(null)}
                    user={session?.user}
                  />
                )}
                {activeTab === 'cronograma' && <CronogramaPage selectedObraId={selectedObraId} user={session?.user} />}
                {activeTab === 'rdo' && <RDOPage selectedObraId={selectedObraId} user={session?.user} />}
                {activeTab === 'compras' && <ComprasPage selectedObraId={selectedObraId} obras={obras} user={session?.user} />}
                {activeTab === 'gestao' && <GestaoPage selectedObraId={selectedObraId} obras={obras} user={session?.user} />}
                {activeTab === 'calendario' && <CalendarioPage selectedObraId={selectedObraId} obras={obras} user={session?.user} />}
                {activeTab === 'visitas' && (
                  <VisitasPage 
                    user={session?.user} 
                    onCreateOrcamento={handleCreateOrcamentoFromVisita} 
                  />
                )}
                {activeTab === 'financeiro' && <FinanceiroPage selectedObraId={selectedObraId} obras={obras} user={session?.user} />}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

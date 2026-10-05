import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor para injetar token JWT de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('edifica_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de resposta para tratamento global de erros
api.interceptors.response.use(
  (response) => {
    // Interceptar para Rastreabilidade de Ações
    const method = response.config.method?.toLowerCase();
    if (['post', 'put', 'delete'].includes(method) && !response.config.url.includes('/audit')) {
      const parts = response.config.url.split('?')[0].split('/').filter(p => p.length > 0);
      const entity_type = parts[0] || 'geral';
      
      // Envia log sem bloquear a requisição atual
      axios.post(`${API_BASE_URL}/audit`, {
        action: method.toUpperCase(),
        entity_type: entity_type,
        entity_id: response.data?.id || null,
        details: { url: response.config.url }
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('edifica_token')}`
        }
      }).catch(err => console.error('Falha ao registrar rastreabilidade', err));
    }
    
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[Edifica API] Sessão expirada ou não autorizada.');
    }
    return Promise.reject(error);
  }
);

export default api;
